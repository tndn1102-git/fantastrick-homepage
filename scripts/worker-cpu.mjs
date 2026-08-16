import { config } from "dotenv";
config({ path: "D:/test3/fantastrick-homepage/.env.local" });

const T = process.env.CF_DOMAIN_TOKEN;
const ACC = "deca447f8b1b4d9917996947dfc14ce2";
const since = new Date(Date.now() - 3 * 86400e3).toISOString();
const until = new Date().toISOString();

const query = `
query($acc:String!,$since:Time!,$until:Time!){
  viewer{ accounts(filter:{accountTag:$acc}){
    workersInvocationsAdaptive(limit:100, filter:{
      datetime_geq:$since, datetime_leq:$until, scriptName:"fantastrick-homepage"
    }){
      sum{ requests errors }
      quantiles{ cpuTimeP50 cpuTimeP99 cpuTimeP999 }
      dimensions{ date }
    }
  }}
}`;

const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { acc: ACC, since, until } }),
});
const j = await r.json();
if (j.errors) { console.log("실패:", JSON.stringify(j.errors).slice(0, 400)); process.exit(1); }

const rows = j.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
console.log("날짜         요청     오류   CPU중앙값  상위1%   상위0.1%   (밀리초)");
for (const x of rows) {
  const q = x.quantiles, ms = (v) => (v / 1000).toFixed(1).padStart(8);
  console.log(x.dimensions.date, String(x.sum.requests).padStart(9), String(x.sum.errors).padStart(6),
    ms(q.cpuTimeP50), ms(q.cpuTimeP99), ms(q.cpuTimeP999));
}
console.log("\n※ 무료 요금제는 요청 1건당 CPU 10밀리초가 상한이다.");
console.log("   상위 1%가 10밀리초를 크게 넘는데 오류가 없다면 → 유료 요금제라는 뜻.");
