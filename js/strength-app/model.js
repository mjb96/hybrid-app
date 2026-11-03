import { indexSlotsByDate } from '../analytics/weekly-aggregate.js';
import { addDaysISO, todayKey, localDayKey } from '../dates.js';
import { isValidWorkingSet } from '../set-utils.js';
import { canonicalExerciseId, resolveExercise, primaryMuscleGroups } from '../exercises/catalog.js';
import { estimatedE1rmForSet, isE1rmExercise } from '../strength/e1rm.js';

export function measurements(state, today = todayKey()) {
  const grouped = new Map();
  for (const r of state.bodyWeightLog || []) {
    const date = localDayKey(r.date), weight = Number(r.weight);
    if (!date || date > today || !Number.isFinite(weight) || weight <= 0) continue;
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push({ date, weight });
  }
  // Conflicting duplicate days are not silently resolved by array order.
  return [...grouped.values()].filter(rs => rs.every(r => r.weight === rs[0].weight)).map(rs => rs[0]).sort((a,b) => a.date.localeCompare(b.date));
}
export function weightMean(rows, end, days = 7) {
  const start = addDaysISO(end, 1-days), selected = rows.filter(r => r.date >= start && r.date <= end);
  return { value: selected.length ? selected.reduce((n,r)=>n+r.weight,0)/selected.length : null, count:selected.length };
}
export function strengthRecords(state, today = todayKey()) {
  const { allByDate } = indexSlotsByDate(state), rows=[];
  for (const [date, slots] of allByDate) {
    if (date > today) continue;
    for (const slot of slots) for (const [name, sets] of Object.entries(slot.lifts || {})) {
      if (!Array.isArray(sets)) continue;
      sets.forEach((s,i)=>{
        if (!isValidWorkingSet(s)) return;
        const load=Number(s.w), reps=Number(s.r);
        if (!Number.isFinite(reps)||reps<=0||!Number.isInteger(reps)||!Number.isFinite(load)||load<0) return;
        const ex=resolveExercise(name), timed=ex?.volumeEligible===false;
        rows.push({date, session:`${slot.weekKey}:${slot.day}`, name:ex?.name||name, id:canonicalExerciseId(name), set:i+1, load,reps, rir:s.rir??null,
          loadGoalEligible:!timed&&isE1rmExercise(name,s)&&s.loadMode!=='banded', e1rm:timed?null:estimatedE1rmForSet(name,s)||null, volume:timed||s.bw||s.band||s.loadMode==='assisted'||s.loadMode==='banded'?null:load*reps,
          muscles:ex?primaryMuscleGroups(ex):['Unmapped'], source:`${slot.weekKey} / ${slot.day} / ${name} / set ${i+1}` });
      });
    }
  }
  return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.session.localeCompare(b.session)||a.set-b.set);
}
export function exerciseSeries(records, exercise, metric='e1rm', weights=[]) {
  const groups=new Map();
  for(const r of records.filter(r=>r.id===canonicalExerciseId(exercise))){if(!groups.has(r.date))groups.set(r.date,[]);groups.get(r.date).push(r)}
  return [...groups].map(([date,rs])=>{
    const e=Math.max(0,...rs.map(r=>r.e1rm||0));
    const bw=weights.filter(w=>w.date<=date&&w.date>=addDaysISO(date,-7)).at(-1);
    const value=metric==='sets'?rs.length:metric==='reps'?rs.reduce((n,r)=>n+r.reps,0):metric==='load'?Math.max(...rs.map(r=>r.load)):metric==='relative'?(e&&bw?e/bw.weight:null):e||null;
    return {date,value,records:rs};
  }).filter(p=>p.value!==null);
}
export function goalProgress(goal, records) {
  const same=records.filter(r=>r.id===canonicalExerciseId(goal.exercise));
  const matches=same.filter(r=>r.loadGoalEligible&&r.load>=goal.load&&r.reps>=goal.reps);
  const latestDate=same.at(-1)?.date;
  const latest=same.filter(r=>r.date===latestDate);
  const estimate=Math.max(0,...latest.map(r=>r.e1rm||0));
  const target=goal.reps===1?goal.load:goal.load*(1+goal.reps/30);
  return {achieved:matches.length>0,achievedDate:matches[0]?.date,latestDate,estimate:estimate||null,percent:estimate&&target?estimate/target*100:null};
}
export function saveMeasurement(state,date,weight,today=todayKey()) {
  if(!localDayKey(date)||date>today||!Number.isFinite(weight)||weight<=0)throw Error('Enter a valid date and positive weight. Future weigh-ins are not allowed.');
  const rows=(state.bodyWeightLog||[]).filter(r=>r.date!==date);
  rows.push({date,weight}); state.bodyWeightLog=rows.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  state.settings ||= {}; state.settings.defaultBodyWeight=measurements(state,today).at(-1)?.weight;
}
export function saveGoal(state,exercise,load,reps) {
  if(!exercise?.trim()||!Number.isFinite(load)||load<=0||!Number.isInteger(reps)||reps<1||reps>30)throw Error('Choose an exercise, positive target weight and 1–30 whole reps.');
  state.settings ||= {}; state.settings.strengthGoals ||= [];
  const list=state.settings.strengthGoals, id=canonicalExerciseId(exercise);
  const value={exercise:exercise.trim(),load,reps};
  const found=list.findIndex(g=>canonicalExerciseId(g.exercise)===id);
  if(found>=0)list[found]=value;else list.push(value);
}
