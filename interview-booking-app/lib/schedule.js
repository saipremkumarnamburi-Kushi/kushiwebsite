export const TOPICS=['D365 CRM','Power Automate','Azure Integration','JavaScript & APIs'];
export const DURATION=30;
export function dayIST(value){return new Date(new Date(value).getTime()+19800000).toISOString().slice(0,10)}
export function slotsForDay(day,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return [];
 const date=new Date(day+'T00:00:00+05:30');
 if(!Number.isFinite(+date)||dayIST(date)!==day)return [];
 const weekday=new Date(day+'T12:00:00Z').getUTCDay(),weekend=weekday===0||weekday===6;
 const slots=[];for(let m=weekend?600:1140;m<(weekend?780:1260);m+=30){const start=new Date(day+`T${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00+05:30`);if(+start>=now+2*3600000&&+start<=now+28*86400000)slots.push(start.toISOString())}return slots;
}
export function validSlot(start,now=Date.now()){if(typeof start!=='string')return false;const d=new Date(start);return Number.isFinite(+d)&&slotsForDay(dayIST(d),now).includes(d.toISOString())}
export function validateBooking(body,now=Date.now()){
 if(!body||!validSlot(body.startsAt,now))return 'Choose a valid slot at least two hours ahead and within 28 days.';
 if(!TOPICS.includes(body.topic))return 'Choose a valid interview topic.';
 if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>80)return 'Enter a name between 2 and 80 characters.';
 if(typeof body.notes!=='string'||body.notes.length>1000)return 'Keep preparation notes under 1,000 characters.';
 if(!['Beginner','Intermediate','Experienced'].includes(body.experience))return 'Choose your experience level.';
 return null;
}
export function meetingURL(input){if(input==='')return '';try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
