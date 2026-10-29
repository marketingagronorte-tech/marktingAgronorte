import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/stitch-workspace.tsx',import.meta.url),'utf8');
const component=source.slice(source.indexOf('export function StitchCalendar'),source.indexOf('export function StitchMetrics'));
const code=ts.transpileModule(component,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:'h',jsxFragmentFactory:'Fragment',module:ts.ModuleKind.ESNext}}).outputText.replace('export function','function');
function harness(records,editor=true){
 let index=0;const state=[],opened=[],created=[];
 const h=(type,props,...children)=>({type,props:{...props,children}});
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const date=s=>new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
 const plusDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);};
 const icons=['CalendarDays','Camera','CheckCircle2','LayoutDashboard','List','ChevronLeft','ChevronRight','Plus','ShieldCheck','Users','SlidersHorizontal','ExternalLink','X','PanelTitle','Blank'];
 const deps={h,Fragment:'fragment',useRef:()=>({current:null}),useEffect:()=>{},useState:initial=>{const i=index++;if(!(i in state))state[i]=initial;return [state[i],value=>state[i]=value];},iso,date,plusDays,nextBirthday:()=>'',calendarUrl:()=>'',createPortal:n=>n,document:{body:{}},...Object.fromEntries(icons.map(x=>[x,x]))};
 const renderComponent=new Function(...Object.keys(deps),code+'\nreturn StitchCalendar;')(...Object.values(deps));
 const context={records,editor,today:'2026-10-29',calendarRows:records,settings:{calendar:'marketing@example.com'},open:(kind,row)=>opened.push({kind,row}),createEvent:day=>created.push(day)};
 const render=()=>{index=0;return renderComponent({context,month:new Date(2026,9,1),setMonth:()=>{}});};
 function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
 return {render,nodes,opened,created,date};
}
const row=(id,kind='event')=>({id,kind,date:'2026-10-29',label:'Compromisso',color:'green',updated_at:'v1',owner:'original-owner',data:{title:'Registro '+id,date:'2026-10-29',description:'Descrição completa',status:'Concluído'}});
test('Clicking an existing calendar entry opens its original record for editing',()=>{const record=row('one');const h=harness([record]);h.nodes(h.render()).find(n=>n.props?.className==='sx-calendar-event green').props.onClick();assert.equal(h.opened.length,1);assert.equal(h.opened[0].kind,'event');assert.equal(h.opened[0].row,record);assert.equal(h.opened[0].row.updated_at,'v1');});
test('Clicking a date with one record opens editing directly',()=>{const h=harness([row('one')]);h.nodes(h.render()).find(n=>n.props?.['aria-label']==='Selecionar '+h.date('2026-10-29')).props.onClick();assert.equal(h.opened[0].row.id,'one');});
test('A date with multiple entries opens a chooser; choosing preserves the correct record kind',()=>{const h=harness([row('one'),row('two','content')]);h.nodes(h.render()).find(n=>n.props?.['aria-label']==='Selecionar '+h.date('2026-10-29')).props.onClick();assert.equal(h.opened.length,0);const nodes=h.nodes(h.render());assert.ok(nodes.some(n=>n.type==='dialog'));const choices=h.nodes(nodes.find(n=>n.type==='dialog')).filter(n=>n.type==='button'&&n.props?.children?.flat().includes('Abrir detalhes / editar'));assert.equal(choices.length,2);choices[1].props.onClick();assert.equal(h.opened[0].kind,'content');assert.equal(h.opened[0].row.id,'two');});
test('A reader can see day details without obtaining edit actions',()=>{const h=harness([row('one')],false);h.nodes(h.render()).find(n=>n.props?.className==='sx-calendar-event green').props.onClick();const nodes=h.nodes(h.render());assert.ok(nodes.some(n=>n.type==='dialog'));assert.equal(h.opened.length,0);assert.equal(nodes.filter(n=>n.type==='button'&&n.props?.children?.flat().includes('Abrir detalhes / editar')).length,0);});
