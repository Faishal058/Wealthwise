package com.wealthwise.controller;

import com.wealthwise.service.AnalyticsService;
import com.wealthwise.service.HoldingsService;
import com.wealthwise.service.XirrService;
import com.wealthwise.repository.InvestmentLotRepository;
import com.wealthwise.repository.InvestmentTransactionRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * M08 / M10 — Holdings Controller + Portfolio Analytics.
 * Returns current holdings, portfolio summary, asset allocation.
 */
@RestController
@RequestMapping("/api/holdings")
public class HoldingsController {

    private static final Logger log = LoggerFactory.getLogger(HoldingsController.class);

    private final HoldingsService holdingsService;
    private final XirrService xirrService;
    private final InvestmentLotRepository lotRepo;
    private final InvestmentTransactionRepository txRepo;
    private final AnalyticsService analyticsService;

    public HoldingsController(HoldingsService holdingsService, XirrService xirrService,
                               InvestmentLotRepository lotRepo,
                               InvestmentTransactionRepository txRepo,
                               AnalyticsService analyticsService) {
        this.holdingsService  = holdingsService;
        this.xirrService      = xirrService;
        this.lotRepo          = lotRepo;
        this.txRepo           = txRepo;
        this.analyticsService = analyticsService;
    }

    /** All current holdings with gain/loss + XIRR per fund */
    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        long t0 = System.currentTimeMillis();
        UUID userId = UUID.fromString(auth.getName());
        log.info("[API] GET /api/holdings  ▶ user={}", userId);
        var holdings = holdingsService.getHoldings(userId);

        // Enrich with XIRR per fund
        List<Map<String, Object>> result = holdings.stream().map(h -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("schemeCode",   h.schemeCode());
            m.put("fundName",     h.fundName());
            m.put("amcName",      h.amcName());
            m.put("category",     h.category());
            m.put("planType",     h.planType());
            m.put("riskLevel",    h.riskLevel());
            m.put("totalUnits",   h.totalUnits());
            m.put("avgCostNav",   h.avgCostNav());
            m.put("investedValue",h.investedValue());
            m.put("currentNav",   h.currentNav());
            m.put("navDate",      h.navDate());
            m.put("currentValue", h.currentValue());
            m.put("gainLoss",     h.gainLoss());
            m.put("gainLossPct",  h.gainLossPct() != null ? Math.round(h.gainLossPct() * 100.0) / 100.0 : null);

            // Build XIRR cash flows from lots — skip lots with null purchaseDate
            List<XirrService.CashFlow> flows = h.lots().stream()
                .filter(l -> l.getPurchaseDate() != null
                          && l.getUnitsRemaining() != null
                          && l.getCostPerUnit()    != null)
                .map(l -> new XirrService.CashFlow(
                    l.getPurchaseDate(),
                    -l.getUnitsRemaining().multiply(l.getCostPerUnit()).doubleValue()))
                .collect(Collectors.toList());
            // Add current value as final positive flow
            BigDecimal cv = h.currentValue() != null ? h.currentValue() : BigDecimal.ZERO;
            flows.add(new XirrService.CashFlow(LocalDate.now(), cv.doubleValue()));

            Double xirr = flows.size() >= 2 ? xirrService.calculateXirr(flows) : null;
            m.put("xirr", xirr != null ? Math.round(xirr * 10000.0) / 100.0 : null); // as %
            return m;
        }).collect(Collectors.toList());

        log.info("[API] GET /api/holdings  ✔ {}ms  {} fund(s) returned",
            System.currentTimeMillis() - t0, result.size());
        return ResponseEntity.ok(result);
    }

    /** Portfolio-level summary */
    @GetMapping("/summary")
    public ResponseEntity<?> summary(Authentication auth) {
        long t0 = System.currentTimeMillis();
        UUID userId = UUID.fromString(auth.getName());
        log.info("[API] GET /api/holdings/summary  ▶ user={}", userId);
        var holdings = holdingsService.getHoldings(userId);

        BigDecimal totalInvested = holdings.stream().map(HoldingsService.Holding::investedValue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCurrent = holdings.stream().map(HoldingsService.Holding::currentValue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalGain = totalCurrent.subtract(totalInvested);
        Double gainPct = totalInvested.compareTo(BigDecimal.ZERO) > 0
            ? totalGain.divide(totalInvested, 8, RoundingMode.HALF_UP).doubleValue() * 100 : 0.0;

        // Portfolio XIRR using all lots
        List<XirrService.CashFlow> allFlows = new ArrayList<>();
        holdings.forEach(h -> h.lots().forEach(l ->
            allFlows.add(new XirrService.CashFlow(
                l.getPurchaseDate(),
                -l.getUnitsRemaining().multiply(l.getCostPerUnit()).doubleValue()))));
        allFlows.add(new XirrService.CashFlow(LocalDate.now(), totalCurrent.doubleValue()));
        Double portfolioXirr = xirrService.calculateXirr(allFlows);

        // Asset allocation by category
        Map<String, BigDecimal> allocationMap = new LinkedHashMap<>();
        holdings.forEach(h -> {
            String cat = categorizeBroad(h.category());
            allocationMap.merge(cat, h.currentValue(), BigDecimal::add);
        });

        // Risk score (weighted avg of riskLevel 1-6)
        BigDecimal weightedRisk = holdings.stream()
            .map(h -> BigDecimal.valueOf(h.riskLevel()).multiply(h.currentValue()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        Double portfolioRisk = totalCurrent.compareTo(BigDecimal.ZERO) > 0
            ? weightedRisk.divide(totalCurrent, 4, RoundingMode.HALF_UP).doubleValue() : 3.0;

        // Earliest investment date for CAGR calculation
        LocalDate earliest = holdings.stream()
            .flatMap(h -> h.lots().stream())
            .map(l -> l.getPurchaseDate())
            .filter(Objects::nonNull)
            .min(LocalDate::compareTo)
            .orElse(LocalDate.now().minusYears(1));
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(earliest, LocalDate.now());
        double holdingYears = Math.max(daysBetween / 365.25, 0.0833);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalInvested", totalInvested);
        res.put("currentValue", totalCurrent);
        res.put("totalGain", totalGain);
        res.put("gainPct", Math.round(gainPct * 100.0) / 100.0);
        res.put("portfolioXirr", portfolioXirr != null ? Math.round(portfolioXirr * 10000.0) / 100.0 : null);
        res.put("portfolioRiskScore", portfolioRisk);
        res.put("riskLabel", riskLabel(portfolioRisk));
        res.put("fundCount", holdings.size());
        res.put("allocation", allocationMap);
        res.put("earliestInvestmentDate", earliest.toString());
        res.put("holdingYears", Math.round(holdingYears * 100.0) / 100.0);
        log.info("[API] GET /api/holdings/summary  ✔ {}ms  invested=₹{} current=₹{} xirr={}%",
            System.currentTimeMillis() - t0, totalInvested.toPlainString(),
            totalCurrent.toPlainString(), portfolioXirr != null ? Math.round(portfolioXirr * 10000.0) / 100.0 : "n/a");
        return ResponseEntity.ok(res);
    }

    /** Monthly NAV-based portfolio growth timeline */
    @GetMapping("/growth")
    public ResponseEntity<?> growth(Authentication auth) {
        long t0 = System.currentTimeMillis();
        UUID userId = UUID.fromString(auth.getName());
        log.info("[API] GET /api/holdings/growth  ▶ user={}", userId);
        var result = analyticsService.getGrowthTimeline(userId);
        log.info("[API] GET /api/holdings/growth  ✔ {}ms  {} month(s)",
            System.currentTimeMillis() - t0, result.size());
        return ResponseEntity.ok(result);
    }

    /** Full analytics risk profile: Sharpe, volatility, max drawdown, diversification */
    @GetMapping("/risk-profile")
    public ResponseEntity<?> riskProfile(Authentication auth) {
        long t0 = System.currentTimeMillis();
        UUID userId = UUID.fromString(auth.getName());
        log.info("[API] GET /api/holdings/risk-profile  ▶ user={}", userId);
        var result = analyticsService.getRiskProfile(userId);
        log.info("[API] GET /api/holdings/risk-profile  ✔ {}ms",
            System.currentTimeMillis() - t0);
        return ResponseEntity.ok(result);
    }

    /** SIP vs lumpsum intelligence per fund */
    @GetMapping("/sip-intelligence")
    public ResponseEntity<?> sipIntelligence(Authentication auth) {
        long t0 = System.currentTimeMillis();
        UUID userId = UUID.fromString(auth.getName());
        log.info("[API] GET /api/holdings/sip-intelligence  ▶ user={}", userId);
        var result = analyticsService.getSipIntelligence(userId);
        log.info("[API] GET /api/holdings/sip-intelligence  ✔ {}ms  {} fund(s)",
            System.currentTimeMillis() - t0, result.size());
        return ResponseEntity.ok(result);
    }

    private String categorizeBroad(String category) {
        if (category == null) return "Other";
        String c = category.toLowerCase();
        if (c.contains("equity") || c.contains("large") || c.contains("mid") || c.contains("small") || c.contains("flexi") || c.contains("thematic")) return "Equity";
        if (c.contains("debt") || c.contains("liquid") || c.contains("bond") || c.contains("duration") || c.contains("credit")) return "Debt";
        if (c.contains("hybrid") || c.contains("balanced") || c.contains("asset allocation")) return "Hybrid";
        if (c.contains("gold") || c.contains("silver") || c.contains("commodity")) return "Commodity";
        return "Other";
    }

    private String riskLabel(Double score) {
        if (score == null) return "Moderate";
        if (score < 1.5) return "Low";
        if (score < 2.5) return "Low to Moderate";
        if (score < 3.5) return "Moderate";
        if (score < 4.5) return "Moderately High";
        if (score < 5.5) return "High";
        return "Very High";
    }

    /**
     * DELETE /api/holdings/{schemeCode}
     * Permanently removes all investment lots AND transactions for this fund.
     * This is the "remove holding" action — only affects the current user's data.
     */
    @Transactional
    @DeleteMapping("/{schemeCode}")
    @CacheEvict(value = "holdings", allEntries = true)
    public ResponseEntity<?> deleteHolding(@PathVariable String schemeCode, Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        lotRepo.deleteByUserIdAndSchemeCode(userId, schemeCode);
        txRepo.deleteByUserIdAndSchemeCode(userId, schemeCode);
        return ResponseEntity.ok(Map.of("message", "Holding deleted", "schemeCode", schemeCode));
    }
}
