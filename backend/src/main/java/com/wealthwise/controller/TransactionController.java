package com.wealthwise.controller;

import com.wealthwise.model.InvestmentLot;
import com.wealthwise.model.InvestmentTransaction;
import com.wealthwise.repository.InvestmentLotRepository;
import com.wealthwise.repository.InvestmentTransactionRepository;
import com.wealthwise.repository.NavDailyRepository;
import com.wealthwise.repository.SchemeMasterRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;


/**
 * M06 — Enhanced Transaction Controller.
 * Transactions are IMMUTABLE.  
 * On BUY: creates investment lots.
 * On SELL: applies FIFO, calculates STCG/LTCG.
 * On CSV: bulk-imports from uploaded file.
 */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final InvestmentTransactionRepository txRepo;
    private final InvestmentLotRepository lotRepo;
    private final NavDailyRepository navRepo;
    private final SchemeMasterRepository schemeRepo;

    // Accepted date formats for CSV parsing
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd-MM-yyyy"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("MM/dd/yyyy"),
        DateTimeFormatter.ofPattern("d-MMM-yyyy"),
        DateTimeFormatter.ofPattern("d/MMM/yyyy")
    );

    public TransactionController(InvestmentTransactionRepository txRepo,
                                  InvestmentLotRepository lotRepo,
                                  NavDailyRepository navRepo,
                                  SchemeMasterRepository schemeRepo) {
        this.txRepo = txRepo;
        this.lotRepo = lotRepo;
        this.navRepo = navRepo;
        this.schemeRepo = schemeRepo;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        var txns = txRepo.findByUserIdOrderByTransactionDateDesc(userId);

        // Batch-load scheme metadata (category + risk) for all unique codes in one pass
        Map<String, com.wealthwise.model.SchemeMaster> schemeCache = new HashMap<>();
        txns.stream()
            .map(com.wealthwise.model.InvestmentTransaction::getSchemeCode)
            .filter(Objects::nonNull)
            .distinct()
            .forEach(code -> schemeRepo.findByAmfiCode(code).ifPresent(sm -> schemeCache.put(code, sm)));

        // Build enriched response — merge category + riskLevel into each transaction map
        var result = txns.stream().map(tx -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              tx.getId());
            m.put("schemeCode",      tx.getSchemeCode());
            m.put("fundName",        tx.getFundName());
            m.put("folioNumber",     tx.getFolioNumber());
            m.put("transactionType", tx.getTransactionType());
            m.put("amount",          tx.getAmount());
            m.put("nav",             tx.getNav());
            m.put("units",           tx.getUnits());
            m.put("transactionDate", tx.getTransactionDate());
            m.put("status",          tx.getStatus());
            m.put("source",          tx.getSource());
            m.put("note",            tx.getNote());
            // ── Enriched fields ──────────────────────────────────────────
            com.wealthwise.model.SchemeMaster sm = schemeCache.get(tx.getSchemeCode());
            m.put("category",  sm != null && sm.getCategory()  != null ? sm.getCategory()  : deriveCategoryFromFundName(tx.getFundName()));
            m.put("riskLevel", sm != null && sm.getRiskLevel() != null ? sm.getRiskLevel() : 3);
            m.put("riskLabel", riskLabel(sm != null && sm.getRiskLevel() != null ? sm.getRiskLevel() : 3));
            m.put("amcName",   sm != null ? sm.getAmcName() : null);
            return m;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** Heuristic category from fund name when scheme_master has no record. */
    private String deriveCategoryFromFundName(String name) {
        if (name == null) return "Other";
        String n = name.toLowerCase(Locale.ROOT);
        if (n.contains("liquid") || n.contains("overnight") || n.contains("money market")) return "Debt - Liquid";
        if (n.contains("small cap"))  return "Equity - Small Cap";
        if (n.contains("mid cap") || n.contains("midcap")) return "Equity - Mid Cap";
        if (n.contains("large cap") || n.contains("bluechip")) return "Equity - Large Cap";
        if (n.contains("flexi cap") || n.contains("multi cap") || n.contains("diversified")) return "Equity - Flexi Cap";
        if (n.contains("index") || n.contains("nifty") || n.contains("sensex") || n.contains("nasdaq")) return "Equity - Index";
        if (n.contains("elss") || n.contains("tax saver") || n.contains("tax saving")) return "Equity - ELSS";
        if (n.contains("hybrid") || n.contains("equity & debt") || n.contains("balanced")) return "Hybrid";
        if (n.contains("debt") || n.contains("bond") || n.contains("credit") || n.contains("gilt") || n.contains("duration")) return "Debt";
        if (n.contains("gold") || n.contains("silver") || n.contains("commodity")) return "Commodity";
        if (n.contains("fof") || n.contains("fund of fund") || n.contains("international") || n.contains("global")) return "International FoF";
        return "Equity";
    }

    private String riskLabel(int level) {
        return switch (level) {
            case 1 -> "Low";
            case 2 -> "Low to Moderate";
            case 3 -> "Moderate";
            case 4 -> "Moderately High";
            case 5 -> "High";
            case 6 -> "Very High";
            default -> "Moderate";
        };
    }

    @PostMapping
    @CacheEvict(value = "holdings", allEntries = true)
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());

        String type = getString(body, "transactionType");
        String schemeCode = getString(body, "schemeCode");
        String fundName  = getString(body, "fundName");
        String folio     = getString(body, "folioNumber");
        String dateStr   = getString(body, "transactionDate");
        BigDecimal amount = getBigDecimal(body, "amount");
        BigDecimal units  = getBigDecimal(body, "units");
        BigDecimal nav    = getBigDecimal(body, "nav");

        if (type == null || schemeCode == null || dateStr == null)
            return ResponseEntity.badRequest().body(Map.of("message", "transactionType, schemeCode and transactionDate are required"));

        LocalDate txDate;
        try { txDate = LocalDate.parse(dateStr); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid date. Use yyyy-MM-dd")); }

        // Lookup NAV if not provided
        if (nav == null) {
            var navs = navRepo.findNavOnOrBefore(schemeCode, txDate, PageRequest.of(0, 1));
            if (!navs.isEmpty()) nav = navs.get(0).getNavValue();
            else {
                var sm = schemeRepo.findByAmfiCode(schemeCode);
                if (sm.isPresent() && sm.get().getLastNav() != null) nav = sm.get().getLastNav();
            }
        }

        // Calculate units if not provided
        if (units == null && nav != null && nav.compareTo(BigDecimal.ZERO) > 0 && amount != null) {
            units = amount.divide(nav, 6, RoundingMode.HALF_UP);
        }

        InvestmentTransaction tx = buildTransaction(userId, schemeCode, fundName, folio, type,
            amount, nav, units, txDate, getString(body, "note"), "Manual");
        tx = txRepo.save(tx);

        applyLotLogic(userId, schemeCode, type, units, nav, fundName, tx.getFolioNumber(), txDate, tx);

        return ResponseEntity.ok(tx);
    }

    /**
     * POST /api/transactions/import-csv
     * Accepts a multipart/form-data file named "file".
     */
    @PostMapping("/import-csv")
    @CacheEvict(value = "holdings", allEntries = true)
    public ResponseEntity<?> importCsv(@RequestParam("file") MultipartFile file, Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Uploaded file is empty"));
        }
        String filename = file.getOriginalFilename();
        if (filename != null && !filename.toLowerCase().endsWith(".csv")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only .csv files are supported"));
        }

        List<Map<String, Object>> rowResults = new ArrayList<>();
        int imported = 0, failed = 0, skipped = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String[] headers = null;
            reader.mark(3);
            int firstChar = reader.read();
            if (firstChar != '\uFEFF') reader.reset();

            String line;
            int lineNum = 0;

            while ((line = reader.readLine()) != null) {
                lineNum++;
                line = line.trim();
                if (line.isBlank()) { skipped++; continue; }

                if (headers == null) {
                    headers = splitCsvLine(line);
                    for (int i = 0; i < headers.length; i++)
                        headers[i] = headers[i].toLowerCase(Locale.ROOT).trim().replaceAll("[^a-z_0-9]", "_");
                    continue;
                }

                String[] values = splitCsvLine(line);
                Map<String, String> cols = new LinkedHashMap<>();
                for (int i = 0; i < headers.length && i < values.length; i++) {
                    cols.put(headers[i], values[i].trim());
                }

                Map<String, Object> rowResult = new LinkedHashMap<>();
                rowResult.put("row", lineNum);

                try {
                    String schemeCode = coalesce(cols, "scheme_code", "amfi_code", "amficode", "schemecode", "code");
                    String type = coalesce(cols, "transaction_type", "type", "txn_type", "txtype", "transactiontype");
                    String dateStr = coalesce(cols, "date", "transaction_date", "transactiondate", "txn_date");
                    String fundName = coalesce(cols, "fund_name", "fundname", "scheme_name", "schemename", "fund");
                    String amountStr = coalesce(cols, "amount");
                    String navStr = coalesce(cols, "nav", "purchase_nav", "allotment_nav");
                    String unitsStr = coalesce(cols, "units");
                    String folio = coalesce(cols, "folio_number", "folio", "folionumber");
                    String note = coalesce(cols, "note", "notes", "remarks");

                    if (schemeCode == null || schemeCode.isBlank()) {
                        rowResult.put("status", "FAILED"); rowResult.put("message", "Missing scheme_code");
                        failed++; rowResults.add(rowResult); continue;
                    }
                    if (type == null || type.isBlank()) {
                        rowResult.put("status", "FAILED"); rowResult.put("message", "Missing transaction_type");
                        failed++; rowResults.add(rowResult); continue;
                    }
                    if (dateStr == null || dateStr.isBlank()) {
                        rowResult.put("status", "FAILED"); rowResult.put("message", "Missing date");
                        failed++; rowResults.add(rowResult); continue;
                    }

                    LocalDate txDate = parseDate(dateStr);
                    if (txDate == null) {
                        rowResult.put("status", "FAILED"); rowResult.put("message", "Unrecognised date format: " + dateStr);
                        failed++; rowResults.add(rowResult); continue;
                    }

                    String normType = normaliseType(type);
                    if (normType == null) {
                        rowResult.put("status", "FAILED"); rowResult.put("message", "Unknown transaction_type: " + type);
                        failed++; rowResults.add(rowResult); continue;
                    }

                    BigDecimal amount = parseBD(amountStr);
                    BigDecimal nav    = parseBD(navStr);
                    BigDecimal units  = parseBD(unitsStr);

                    if (fundName == null || fundName.isBlank()) {
                        var sm = schemeRepo.findByAmfiCode(schemeCode);
                        if (sm.isPresent()) fundName = sm.get().getSchemeName();
                    }

                    if (nav == null) {
                        var navs = navRepo.findNavOnOrBefore(schemeCode, txDate, PageRequest.of(0, 1));
                        if (!navs.isEmpty()) nav = navs.get(0).getNavValue();
                        else {
                            var sm = schemeRepo.findByAmfiCode(schemeCode);
                            if (sm.isPresent() && sm.get().getLastNav() != null) nav = sm.get().getLastNav();
                        }
                    }

                    if (units == null && nav != null && nav.compareTo(BigDecimal.ZERO) > 0 && amount != null) {
                        units = amount.divide(nav, 6, RoundingMode.HALF_UP);
                    }
                    if (amount == null && units != null && nav != null && nav.compareTo(BigDecimal.ZERO) > 0) {
                        amount = units.multiply(nav).setScale(4, RoundingMode.HALF_UP);
                    }

                    InvestmentTransaction tx = buildTransaction(userId, schemeCode, fundName, folio, normType, amount, nav, units, txDate, note, "CSV");
                    tx = txRepo.save(tx);
                    applyLotLogic(userId, schemeCode, normType, units, nav, fundName, tx.getFolioNumber(), txDate, tx);

                    rowResult.put("status", "OK");
                    rowResult.put("message", normType.replace("_", " ") + " imported");
                    rowResult.put("txId", tx.getId());
                    imported++;
                } catch (Exception ex) {
                    rowResult.put("status", "FAILED"); rowResult.put("message", "Error: " + ex.getMessage());
                    failed++;
                }
                rowResults.add(rowResult);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to parse CSV: " + e.getMessage()));
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("imported", imported); summary.put("failed", failed); summary.put("skipped", skipped);
        summary.put("rows", rowResults);
        return ResponseEntity.ok(summary);
    }

    private InvestmentTransaction buildTransaction(UUID userId, String schemeCode, String fundName,
            String folio, String type, BigDecimal amount, BigDecimal nav, BigDecimal units,
            LocalDate txDate, String note, String source) {
        InvestmentTransaction tx = new InvestmentTransaction();
        tx.setUserId(userId);
        tx.setSchemeCode(schemeCode);
        tx.setFundName(fundName);
        String resolvedFolio = (folio != null && !folio.isBlank() && !folio.equals("DEFAULT"))
            ? folio
            : generateFolio(userId, schemeCode);
        tx.setFolioNumber(resolvedFolio);
        tx.setTransactionType(type);
        tx.setAmount(amount);
        tx.setNav(nav);
        tx.setUnits(units);
        tx.setTransactionDate(txDate);
        tx.setStatus("Completed");
        tx.setSource(source);
        tx.setNote(note);
        tx.setCreatedAt(OffsetDateTime.now());
        return tx;
    }

    private void applyLotLogic(UUID userId, String schemeCode, String type, BigDecimal units,
            BigDecimal nav, String fundName, String folio, LocalDate txDate, InvestmentTransaction tx) {
        boolean isBuy = type.startsWith("PURCHASE") || type.equals("SWITCH_IN") || type.equals("STP_IN") || type.equals("DIVIDEND_REINVEST");
        boolean isSell = type.equals("REDEMPTION") || type.equals("SWITCH_OUT") || type.equals("STP_OUT") || type.equals("SWP");

        if (isBuy && units != null && units.compareTo(BigDecimal.ZERO) > 0 && nav != null) {
            InvestmentLot lot = new InvestmentLot();
            lot.setUserId(userId);
            lot.setTransactionId(tx.getId());
            lot.setSchemeCode(schemeCode);
            lot.setFundName(fundName);
            lot.setFolioNumber(folio);
            lot.setPurchaseDate(txDate);
            lot.setUnitsPurchased(units);
            lot.setCostNav(nav);
            lot.setCostPerUnit(nav);
            lot.setUnitsRemaining(units);
            lot.setIsFullyRedeemed(false);
            lot.setCreatedAt(OffsetDateTime.now());
            lotRepo.save(lot);
        }
        if (isSell && units != null && units.compareTo(BigDecimal.ZERO) > 0) {
            applyFifo(userId, schemeCode, units, txDate, tx);
        }
    }

    private void applyFifo(UUID userId, String schemeCode, BigDecimal unitsToRedeem,
                            LocalDate redeemDate, InvestmentTransaction tx) {
        BigDecimal remaining = unitsToRedeem;
        BigDecimal stcgGain = BigDecimal.ZERO, ltcgGain = BigDecimal.ZERO;
        BigDecimal stcgUnits = BigDecimal.ZERO, ltcgUnits = BigDecimal.ZERO;

        List<InvestmentLot> lots = lotRepo.findActiveLotsFifo(userId, schemeCode);
        for (InvestmentLot lot : lots) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal consume = remaining.min(lot.getUnitsRemaining());
            BigDecimal gain = consume.multiply(
                tx.getNav() != null ? tx.getNav().subtract(lot.getCostPerUnit()) : BigDecimal.ZERO);

            long holdDays = ChronoUnit.DAYS.between(lot.getPurchaseDate(), redeemDate);
            boolean isLTCG = holdDays >= 365;

            if (isLTCG) { ltcgGain = ltcgGain.add(gain); ltcgUnits = ltcgUnits.add(consume); }
            else         { stcgGain = stcgGain.add(gain); stcgUnits = stcgUnits.add(consume); }

            lot.setUnitsRemaining(lot.getUnitsRemaining().subtract(consume));
            if (lot.getUnitsRemaining().compareTo(BigDecimal.ZERO) <= 0) lot.setIsFullyRedeemed(true);
            lotRepo.save(lot);
            remaining = remaining.subtract(consume);
        }

        tx.setStcgGain(stcgGain); tx.setStcgUnits(stcgUnits);
        tx.setLtcgGain(ltcgGain); tx.setLtcgUnits(ltcgUnits);
        txRepo.save(tx);
    }

    private String[] splitCsvLine(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"'); i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                tokens.add(cur.toString()); cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        tokens.add(cur.toString());
        return tokens.toArray(new String[0]);
    }

    private String coalesce(Map<String, String> cols, String... keys) {
        for (String k : keys) {
            String v = cols.get(k);
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private LocalDate parseDate(String s) {
        if (s == null) return null;
        s = s.trim();
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try { return LocalDate.parse(s, fmt); } catch (Exception ignored) {}
        }
        return null;
    }

    private String normaliseType(String raw) {
        if (raw == null) return null;
        String u = raw.trim().toUpperCase(Locale.ROOT).replace(" ", "_").replace("-", "_");
        return switch (u) {
            case "PURCHASE_SIP","SIP","SIP_PURCHASE","SYSTEMATIC_INVESTMENT" -> "PURCHASE_SIP";
            case "PURCHASE_LUMPSUM","LUMPSUM","PURCHASE","BUY","ADDITIONAL_PURCHASE" -> "PURCHASE_LUMPSUM";
            case "REDEMPTION","SELL","REDEEM","WITHDRAWAL" -> "REDEMPTION";
            case "SWITCH_IN","SWITCH_PURCHASE" -> "SWITCH_IN";
            case "SWITCH_OUT","SWITCH_REDEMPTION","SWITCH" -> "SWITCH_OUT";
            case "STP_IN","STP_PURCHASE" -> "STP_IN";
            case "STP_OUT","STP_REDEMPTION","STP" -> "STP_OUT";
            case "SWP","SYSTEMATIC_WITHDRAWAL" -> "SWP";
            case "DIVIDEND_REINVEST","DIVIDEND_REINVESTMENT","IDCW" -> "DIVIDEND_REINVEST";
            default -> null;
        };
    }

    private BigDecimal parseBD(String s) {
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s.replaceAll("[^0-9.\\-]", "")); }
        catch (Exception e) { return null; }
    }

    private String getString(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }
    private BigDecimal getBigDecimal(Map<String, Object> m, String key) {
        try { Object v = m.get(key); return v != null ? new BigDecimal(v.toString()) : null; }
        catch (Exception e) { return null; }
    }

    /**
     * Auto-generates a stable folio number for manual transactions.
     * Format: WW + first 6 hex chars of userId + last 6 digits of schemeCode.
     * Deterministic: same user + same fund always produces the same folio,
     * so all their transactions for a holding are grouped under one folio.
     */
    private String generateFolio(UUID userId, String schemeCode) {
        String userPart   = userId.toString().replace("-", "").substring(0, 6).toUpperCase();
        String schemePart = schemeCode != null && schemeCode.length() >= 6
            ? schemeCode.replaceAll("[^0-9]", "")
            : schemeCode != null ? schemeCode.replaceAll("[^A-Za-z0-9]", "") : "000000";
        if (schemePart.length() > 6) schemePart = schemePart.substring(schemePart.length() - 6);
        if (schemePart.length() < 6) schemePart = String.format("%6s", schemePart).replace(' ', '0');
        return "WW" + userPart + schemePart;
    }
}
