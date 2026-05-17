package com.wealthwise.service;

import com.wealthwise.model.InvestmentLot;
import com.wealthwise.model.NavDaily;
import com.wealthwise.model.SchemeMaster;
import com.wealthwise.repository.InvestmentLotRepository;
import com.wealthwise.repository.NavDailyRepository;
import com.wealthwise.repository.SchemeMasterRepository;
import org.springframework.cache.annotation.Cacheable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * M08 — Holdings Calculator.
 * Computes current holdings by aggregating active (non-redeemed) lots
 * and valuing them at the latest available NAV.
 */
@Service
public class HoldingsService {

    private static final Logger log = LoggerFactory.getLogger(HoldingsService.class);

    private final InvestmentLotRepository lotRepo;
    private final NavDailyRepository navRepo;
    private final SchemeMasterRepository schemeRepo;
    private final AmfiSeedService amfiSeedService;

    public HoldingsService(InvestmentLotRepository lotRepo, NavDailyRepository navRepo,
                            SchemeMasterRepository schemeRepo, AmfiSeedService amfiSeedService) {
        this.lotRepo = lotRepo;
        this.navRepo = navRepo;
        this.schemeRepo = schemeRepo;
        this.amfiSeedService = amfiSeedService;
    }

    public record Holding(
        String schemeCode,
        String fundName,
        String amcName,
        String category,
        String planType,
        int riskLevel,
        BigDecimal totalUnits,
        BigDecimal avgCostNav,
        BigDecimal investedValue,
        BigDecimal currentNav,
        LocalDate navDate,
        BigDecimal currentValue,
        BigDecimal gainLoss,
        Double gainLossPct,
        List<InvestmentLot> lots
    ) {}

    @Cacheable(value = "holdings", key = "#userId")
    public List<Holding> getHoldings(UUID userId) {
        long startMs = System.currentTimeMillis();
        log.info("[Holdings] ▶ Fetching active lots for user={}", userId);

        // Aggregate lots per scheme
        Map<String, List<InvestmentLot>> byScheme = new LinkedHashMap<>();
        lotRepo.findAllActiveLots(userId).forEach(lot ->
            byScheme.computeIfAbsent(lot.getSchemeCode(), k -> new ArrayList<>()).add(lot));
        log.info("[Holdings]   {} unique scheme(s) found in active lots", byScheme.size());

        List<Holding> holdings = new ArrayList<>();
        for (var entry : byScheme.entrySet()) {
            String code = entry.getKey();
            List<InvestmentLot> lots = entry.getValue();

            BigDecimal totalUnits = lots.stream()
                .map(InvestmentLot::getUnitsRemaining)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalUnits.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal investedValue = lots.stream()
                .map(l -> l.getUnitsRemaining().multiply(l.getCostPerUnit()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal avgCostNav = investedValue.divide(totalUnits, 6, RoundingMode.HALF_UP);

            // ── Step 1: Try nav_daily table (most accurate) ──────────────────
            BigDecimal currentNav = BigDecimal.ZERO;
            LocalDate navDate = null;
            List<NavDaily> navs = navRepo.findLatestBySchemeCode(code, PageRequest.of(0, 1));
            if (!navs.isEmpty()) {
                currentNav = navs.get(0).getNavValue();
                navDate    = navs.get(0).getNavDate();
                log.debug("[Holdings]   [{}] NAV from nav_daily: {} on {}", code, currentNav, navDate);
            }

            // ── Step 2: Fund metadata + fallback NAV from scheme_master ───────
            String fundName = lots.get(0).getFundName() != null ? lots.get(0).getFundName() : code;
            String amcName = null, category = null, planType = null;
            int riskLevel = 3;
            Optional<SchemeMaster> sm = schemeRepo.findByAmfiCode(code);
            if (sm.isPresent()) {
                SchemeMaster s = sm.get();
                amcName  = s.getAmcName();
                category = s.getCategory();
                planType = s.getPlanType();
                if (s.getRiskLevel() != null) riskLevel = s.getRiskLevel();
                if (currentNav.compareTo(BigDecimal.ZERO) == 0 && s.getLastNav() != null
                        && s.getLastNav().compareTo(BigDecimal.ZERO) > 0) {
                    currentNav = s.getLastNav();
                    navDate    = s.getLastNavDate();
                    log.info("[Holdings]   [{}] NAV from scheme_master fallback: {} on {}", code, currentNav, navDate);
                }
            }

            // ── Step 3: Fetch LIVE from MFAPI ────────────────────────────────
            // Trigger if: (a) no NAV at all, OR (b) data is 5–365 days old
            // (> 365 days old = discontinued fund, MFAPI can't help — skip)
            boolean navMissing = currentNav.compareTo(BigDecimal.ZERO) == 0;
            boolean navStale   = navDate != null
                && navDate.isBefore(LocalDate.now().minusDays(5))
                && navDate.isAfter(LocalDate.now().minusYears(1));   // skip discontinued funds
            if (navMissing || navStale) {
                if (navStale) log.info("[Holdings]   [{}] Stale NAV ({}) — fetching live from MFAPI", code, navDate);
                else          log.info("[Holdings]   [{}] No local NAV — fetching live from MFAPI", code);
                BigDecimal liveNav = amfiSeedService.fetchLatestNavForScheme(code);
                if (liveNav != null && liveNav.compareTo(BigDecimal.ZERO) > 0) {
                    currentNav = liveNav;
                    List<NavDaily> fresh = navRepo.findLatestBySchemeCode(code, PageRequest.of(0, 1));
                    if (!fresh.isEmpty()) navDate = fresh.get(0).getNavDate();
                }
            }

            // ── Step 4: Last-resort — use avg cost so gain shows 0 not -100% ──
            if (currentNav.compareTo(BigDecimal.ZERO) == 0) {
                currentNav = avgCostNav;
                log.warn("[Holdings]   [{}] MFAPI also unavailable — using avg cost as NAV placeholder", code);
            }

            // ── Step 5: Recalculate everything with the final resolved NAV ────
            BigDecimal currentValue = totalUnits.multiply(currentNav).setScale(4, RoundingMode.HALF_UP);
            BigDecimal gainLoss     = currentValue.subtract(investedValue);
            Double gainLossPct = investedValue.compareTo(BigDecimal.ZERO) > 0
                ? gainLoss.divide(investedValue, 8, RoundingMode.HALF_UP).doubleValue() * 100
                : 0.0;

            holdings.add(new Holding(code, fundName, amcName, category, planType, riskLevel,
                totalUnits, avgCostNav, investedValue, currentNav, navDate,
                currentValue, gainLoss, gainLossPct, lots));
        }
        long elapsedMs = System.currentTimeMillis() - startMs;
        log.info("[Holdings] ✔ Resolved {} holding(s) in {}ms for user={}", holdings.size(), elapsedMs, userId);
        return holdings;
    }

    public BigDecimal getTotalPortfolioValue(UUID userId) {
        log.info("[Holdings] ▶ Computing total portfolio value for user={}", userId);
        BigDecimal total = getHoldings(userId).stream()
            .map(Holding::currentValue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        log.info("[Holdings] ✔ Total portfolio value = ₹{} for user={}", total.toPlainString(), userId);
        return total;
    }

    public BigDecimal getTotalInvestedValue(UUID userId) {
        log.info("[Holdings] ▶ Computing total invested value for user={}", userId);
        BigDecimal total = getHoldings(userId).stream()
            .map(Holding::investedValue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        log.info("[Holdings] ✔ Total invested value = ₹{} for user={}", total.toPlainString(), userId);
        return total;
    }
}
