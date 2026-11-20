// Referencia GTO RFI por posicao (cash 100bb full-ring). Gerado de listas-fonte verificadas.
// core[] = maos sempre-raise das fontes; combos = soma exata; refCombos = round(pct*1326).
// Ver gtobase.md 2-5. SB e provisorio.
export const GTO_RFI_REFERENCE = {
  UTG: {
    pct: 0.114,
    refCombos: 151,
    combos: 160,
    source: "pokercoaching full-ring UTG 11.4%: 77+,A3s+,K9s+,QTs+,JTs,T9s,AQo+,KQo",
    core: ["77","88","99","A3s","A4s","A5s","A6s","A7s","A8s","A9s","AA","AJs","AKo","AKs","AQo","AQs","ATs","JJ","JTs","K9s","KJs","KK","KQo","KQs","KTs","QJs","QQ","QTs","T9s","TT"],
    never: ["32o","42o","52o","62o","72o","82o","92o","J2o","T2o","93o"],
  },
  MP: {
    pct: 0.157,
    refCombos: 208,
    combos: 214,
    source: "pokercoaching full-ring LJ 15.7%: 66+,A2s+,K7s+,QTs+,JTs,T9s,ATo+,KJo+",
    core: ["66","77","88","99","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","JJ","JTs","K7s","K8s","K9s","KJo","KJs","KK","KQo","KQs","KTs","QJs","QQ","QTs","T9s","TT"],
    never: ["32o","42o","52o","62o","72o","82o","92o","J2o","T2o","93o"],
  },
  CO: {
    pct: 0.261,
    refCombos: 346,
    combos: 350,
    source: "pokercoaching full-ring CO 26.1%: 44+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,54s,A8o+,KTo+,QTo+,JTo",
    core: ["44","54s","55","65s","66","76s","77","87s","88","97s","98s","99","A2s","A3s","A4s","A5s","A6s","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J8s","J9s","JJ","JTo","JTs","K5s","K6s","K7s","K8s","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q8s","Q9s","QJo","QJs","QQ","QTo","QTs","T8s","T9s","TT"],
    never: ["32o","42o","52o","62o","72o","82o","92o","J2o","T2o","93o"],
  },
  BTN: {
    pct: 0.403,
    refCombos: 534,
    combos: 550,
    source: "pokercoaching full-ring BTN 40.3%: 22+,A2s+,K2s+,Q3s+,J5s+,T6s+,96s+,86s+,76s,65s,54s,A3o+,K8o+,Q9o+,J9o+,T9o",
    core: ["22","32s","33","43s","44","54s","55","65s","66","76s","77","86s","87s","88","96s","97s","98s","99","A2s","A3o","A3s","A4o","A4s","A5o","A5s","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J5s","J6s","J7s","J8s","J9o","J9s","JJ","JTo","JTs","K2s","K3s","K4s","K5s","K6s","K7s","K8o","K8s","K9o","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9o","Q9s","QJo","QJs","QQ","QTo","QTs","T6s","T7s","T8s","T9o","T9s","TT"],
    never: ["32o","42o","52o","62o","72o","82o","92o","J2o","T2o","93o"],
  },
  SB: {
    pct: 0.37,
    refCombos: 491,
    combos: 482,
    provisional: true,
    source: "construido a partir do CO + kickers suited e offsuits fracos (provisorio, vd. gtobase.md 2)",
    core: ["22","33","44","54s","55","65s","66","76s","77","87s","88","97s","98s","99","A2o","A2s","A3o","A3s","A4o","A4s","A5o","A5s","A6o","A6s","A7o","A7s","A8o","A8s","A9o","A9s","AA","AJo","AJs","AKo","AKs","AQo","AQs","ATo","ATs","J8s","J9o","J9s","JJ","JTo","JTs","K5s","K6s","K7s","K8o","K8s","K9o","K9s","KJo","KJs","KK","KQo","KQs","KTo","KTs","Q8s","Q9o","Q9s","QJo","QJs","QQ","QTo","QTs","T8s","T9s","TT"],
    never: ["32o","42o","52o","62o","72o","82o","92o","J2o","T2o","93o"],
  },
};
