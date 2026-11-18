const $ = id => document.getElementById(id);
const money = n => Number(n || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
$("data").value=today;
$("data-hoje").textContent=now.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
let items=[];
try{items=JSON.parse(localStorage.getItem("greenFinanceItems")||"[]");}catch{items=[];}
let chartType="entrada";
let currentPage="inicio";

function showPage(name){
  if(!document.querySelector(`[data-page="${name}"]`)) return;
  currentPage=name;
  document.querySelectorAll(".page").forEach(page=>page.classList.toggle("active",page.dataset.page===name));
  document.querySelectorAll(".nav-link").forEach(btn=>btn.classList.toggle("selected",btn.dataset.pageTarget===name));
  document.querySelector("main").scrollTo({top:0,behavior:"smooth"});
  if(name==="historico") renderList("lista-transacoes",$("filtro").value);
  lucide.createIcons();
}
document.querySelectorAll("[data-page-target]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.pageTarget)));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>{
  showPage(btn.dataset.go);
  if(btn.dataset.type) $("tipo").value=btn.dataset.type;
}));
document.querySelectorAll("[data-page-link]").forEach(link=>link.addEventListener("click",e=>{e.preventDefault();showPage(link.dataset.pageLink);}));

function persist(){localStorage.setItem("greenFinanceItems",JSON.stringify(items));}
function totals(){
  const incoming=items.filter(x=>x.type==="entrada").reduce((s,x)=>s+x.value,0);
  const outgoing=items.filter(x=>x.type==="despesa").reduce((s,x)=>s+x.value,0);
  $("saldo").textContent=money(incoming-outgoing);
  $("entradas").textContent=money(incoming);
  $("despesas").textContent=money(outgoing);
  $("economia").textContent=(incoming?Math.max(0,((incoming-outgoing)/incoming)*100):0).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%";
  $("analysis-entradas").textContent=money(incoming);
  $("analysis-despesas").textContent=money(outgoing);
}
function drawChart(){
  const months=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("pt-BR",{month:"short"}).replace(".","")});}
  const sums=months.map(m=>items.filter(x=>x.date.slice(0,7)===m.key&&x.type===chartType).reduce((s,x)=>s+x.value,0));
  const max=Math.max(...sums,1);
  $("chart-total").textContent=money(sums.reduce((s,n)=>s+n,0));
  $("chart-label").textContent=chartType==="entrada"?"Total de entradas":"Total de despesas";
  $("legend-label").textContent=chartType==="entrada"?"Entradas por mês":"Despesas por mês";
  const bars=$("chart-bars");bars.replaceChildren();
  months.forEach((m,i)=>{
    const col=document.createElement("div");col.className="bar-column";
    const track=document.createElement("div");track.className="bar-track";
    const bar=document.createElement("div");bar.className="bar"+(i===5?" highlight":"");bar.style.height=(sums[i]===0?4:Math.max(9,(sums[i]/max)*100))+"%";bar.title=money(sums[i]);track.appendChild(bar);
    const label=document.createElement("span");label.className="bar-label";label.textContent=m.label;col.append(track,label);bars.appendChild(col);
  });
}
function renderList(targetId,filter="todos",limit=0){
  const list=$(targetId);list.replaceChildren();
  const shown=items.filter(x=>filter==="todos"||x.type===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const selected=limit?shown.slice(0,limit):shown;
  if(!selected.length){
    const empty=document.createElement("div");empty.className="empty-state";
    const icon=document.createElement("i");icon.setAttribute("data-lucide","notebook-tabs");
    const title=document.createElement("strong");title.textContent="Nenhuma movimentação encontrada";
    const desc=document.createElement("span");desc.textContent="Seus lançamentos aparecerão aqui.";
    empty.append(icon,title,desc);list.appendChild(empty);lucide.createIcons();return;
  }
  selected.forEach(item=>{
    const row=document.createElement("article");row.className="transaction";
    const main=document.createElement("div");main.className="transaction-main";
    const icon=document.createElement("span");icon.className="transaction-icon"+(item.type==="despesa"?" expense":"");
    const glyph=document.createElement("i");glyph.setAttribute("data-lucide",item.type==="entrada"?"arrow-down-left":"arrow-up-right");icon.appendChild(glyph);
    const copy=document.createElement("div");copy.className="transaction-copy";
    const name=document.createElement("strong");name.textContent=item.description;
    const meta=document.createElement("small");const[y,m,d]=item.date.split("-");meta.textContent=`${item.category} · ${d}/${m}/${y}`;
    copy.append(name,meta);main.append(icon,copy);
    const side=document.createElement("div");side.className="transaction-side";
    const amount=document.createElement("span");amount.className="amount "+(item.type==="entrada"?"income":"expense");amount.textContent=(item.type==="entrada"?"+ ":"− ")+money(item.value);
    const del=document.createElement("button");del.type="button";del.className="delete-button";del.title="Excluir lançamento";del.setAttribute("aria-label","Excluir lançamento");
    const trash=document.createElement("i");trash.setAttribute("data-lucide","trash-2");del.appendChild(trash);
    del.addEventListener("click",()=>{if(confirm(`Excluir "${item.description}"?`)){items=items.filter(x=>x.id!==item.id);persist();update();}});
    side.append(amount,del);row.append(main,side);list.appendChild(row);
  });
  lucide.createIcons();
}
function update(){
  totals();drawChart();
  renderList("recentes","todos",4);
  renderList("lista-transacoes",$("filtro").value);
}
$("form-transacao").addEventListener("submit",e=>{
  e.preventDefault();
  const description=$("descricao").value.trim(),value=Number($("valor").value),date=$("data").value;
  if(!description||!Number.isFinite(value)||value<=0||!date){alert("Confira a descrição, o valor e a data.");return;}
  items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),description,value,type:$("tipo").value,category:$("categoria").value,date,createdAt:Date.now()});
  persist();e.target.reset();$("data").value=today;$("tipo").value="despesa";update();showPage("historico");
});
$("filtro").addEventListener("change",()=>renderList("lista-transacoes",$("filtro").value));
document.querySelectorAll(".switch").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".switch").forEach(b=>b.classList.remove("active"));button.classList.add("active");chartType=button.dataset.chart;drawChart();
}));
function exportCSV(){
  if(!items.length){alert("Ainda não há movimentações para exportar.");return;}
  const rows=[["Descrição","Valor","Tipo","Categoria","Data"],...items.map(x=>[x.description,x.value.toFixed(2).replace(".",","),x.type,x.category,x.date])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="green-finance-lancamentos.csv";a.click();URL.revokeObjectURL(url);
}
$("exportar").addEventListener("click",exportCSV);$("atalho-exportar").addEventListener("click",exportCSV);
$("notificacoes").addEventListener("click",()=>alert("Você está em dia! Continue registrando suas movimentações."));
$("perfil").addEventListener("click",()=>alert("Área de perfil: em uma próxima etapa podemos adicionar suas preferências."));
update();renderWishes();showPage("inicio");lucide.createIcons();

/* Lista de desejos */
let wishes=[];
try{wishes=JSON.parse(localStorage.getItem("greenFinanceWishes")||"[]");}catch{wishes=[];}
function persistWishes(){localStorage.setItem("greenFinanceWishes",JSON.stringify(wishes));}
function renderWishes(){
 const list=$("lista-desejos");if(!list)return;list.replaceChildren();
 const pending=wishes.filter(w=>!w.done);
 $("wish-total").textContent=money(pending.reduce((s,w)=>s+w.value,0));
 $("wish-count").textContent=`${pending.length} ${pending.length===1?"desejo pendente":"desejos pendentes"}`;
 $("wish-list-count").textContent=`${wishes.length} ${wishes.length===1?"item":"itens"}`;
 if(!wishes.length){const empty=document.createElement("div");empty.className="empty-state";const icon=document.createElement("i");icon.setAttribute("data-lucide","heart");const title=document.createElement("strong");title.textContent="Sua lista ainda está vazia";const desc=document.createElement("span");desc.textContent="Adicione algo que você gostaria de conquistar.";empty.append(icon,title,desc);list.appendChild(empty);lucide.createIcons();return;}
 [...wishes].sort((a,b)=>Number(a.done)-Number(b.done)||b.createdAt-a.createdAt).forEach(w=>{
  const card=document.createElement("article");card.className="wish-card"+(w.done?" wish-done":"");
  const symbol=document.createElement("span");symbol.className="wish-icon";const glyph=document.createElement("i");glyph.setAttribute("data-lucide",w.done?"check":"gift");symbol.appendChild(glyph);
  const info=document.createElement("div");info.className="wish-info";const title=document.createElement("strong");title.textContent=w.name;const meta=document.createElement("span");meta.textContent=money(w.value)+" · Prioridade "+w.priority;const state=document.createElement("small");state.textContent=w.done?"Conquistado":"Na sua lista";info.append(title,meta,state);
  const actions=document.createElement("div");actions.className="wish-actions";
  const done=document.createElement("button");done.type="button";done.className="wish-complete";done.title=w.done?"Marcar como pendente":"Marcar como conquistado";done.setAttribute("aria-label",done.title);const di=document.createElement("i");di.setAttribute("data-lucide",w.done?"rotate-ccw":"check");done.appendChild(di);done.addEventListener("click",()=>{w.done=!w.done;persistWishes();renderWishes();});
  const remove=document.createElement("button");remove.type="button";remove.className="wish-remove";remove.title="Excluir desejo";remove.setAttribute("aria-label","Excluir desejo");const ri=document.createElement("i");ri.setAttribute("data-lucide","trash-2");remove.appendChild(ri);remove.addEventListener("click",()=>{if(confirm(`Remover "${w.name}" da lista?`)){wishes=wishes.filter(x=>x.id!==w.id);persistWishes();renderWishes();}});
  actions.append(done,remove);card.append(symbol,info,actions);list.appendChild(card);
 });lucide.createIcons();
}
$("form-desejo").addEventListener("submit",e=>{e.preventDefault();const name=$("desejo-nome").value.trim(),value=Number($("desejo-valor").value),priority=$("desejo-prioridade").value;if(!name||!Number.isFinite(value)||value<=0){alert("Informe um nome e um valor válido.");return;}wishes.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,value,priority,done:false,createdAt:Date.now()});persistWishes();e.target.reset();$("desejo-prioridade").value="Média";renderWishes();});

