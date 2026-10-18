import assert from "node:assert/strict";
import {addBusinessDays,dateValid,diffPercent,calendarUrl,nextBirthday,compareMetrics,safeUrl} from "../lib/domain.mjs";
assert.equal(addBusinessDays("2026-10-16",3),"2026-10-21");
assert.equal(addBusinessDays("2026-10-16",3,["2026-10-19"]),"2026-10-22");
assert.equal(addBusinessDays("2026-10-16",5),"2026-10-23");
assert.equal(dateValid("2026-02-30"),false);assert.equal(dateValid("2028-02-29"),true);
assert.equal(diffPercent(0,50),null);assert.equal(diffPercent(null,50),null);assert.equal(diffPercent(100,125),25);
assert.equal(nextBirthday("10-15","2026-10-16"),"2027-10-15");
assert.equal(nextBirthday("02-29","2026-10-16"),"2027-02-28");
assert.equal(safeUrl("javascript:alert(1)"),null);
const u=new URL(calendarUrl({title:"Teste",date:"2026-10-20"},"marketing@agronorte.coop.py"));
assert.equal(u.searchParams.get("dates"),"20261020/20261021");assert.equal(u.searchParams.get("ctz"),"America/Asuncion");
assert.equal(compareMetrics({platform:"Instagram",traffic:"Orgânico",start:"2026-10-01",end:"2026-10-07",reach:10},{platform:"Instagram",traffic:"Orgânico",start:"2026-10-08",end:"2026-10-14",reach:20},"reach").percent,100);
assert.equal(compareMetrics({platform:"Instagram",traffic:"Pago",start:"2026-10-01",end:"2026-10-07",reach:10},{platform:"Instagram",traffic:"Orgânico",start:"2026-10-08",end:"2026-10-14",reach:20},"reach"),null);
assert.equal(compareMetrics({platform:"Instagram",traffic:"Orgânico",start:"2026-10-01",end:"2026-10-07",reach:10},{platform:"Instagram",traffic:"Orgânico",start:"2026-10-08",end:"2026-10-15",reach:20},"reach"),null);
console.log("Domain checks passed: business days, holidays, dates, privacy-safe links and comparable metric periods.");

