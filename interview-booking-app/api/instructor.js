import {identity,db,json,body,failure} from '../lib/platform.js';import {validSlot,meetingURL} from '../lib/schedule.js';
export default async function handler(req,res){try{
 const user=await identity(req);if(!user.instructor)return json(res,403,{error:'Instructor access required.'});const sql=db();
 if(req.method==='GET'){const bookings=await sql`SELECT * FROM interview_bookings WHERE starts_at>now()-interval '90 days' ORDER BY starts_at LIMIT 1000`;const blocks=await sql`SELECT starts_at FROM interview_blocks WHERE starts_at>now() ORDER BY starts_at`;return json(res,200,{bookings,blocks})}
 const b=body(req);
 if(req.method==='POST'&&b.action==='block'){
  if(!validSlot(b.startsAt))return json(res,400,{error:'Choose a valid future slot.'});
  const result=await sql.transaction([sql`SELECT pg_advisory_xact_lock(431997)`,sql`INSERT INTO interview_blocks(starts_at,created_by) SELECT ${b.startsAt},${user.id} WHERE NOT EXISTS(SELECT 1 FROM interview_bookings WHERE starts_at=${b.startsAt} AND status='confirmed') ON CONFLICT DO NOTHING RETURNING starts_at`],{isolationLevel:'ReadCommitted'});
  if(!result[1].length)return json(res,409,{error:'This slot is already booked or blocked.'});return json(res,200,{blocked:true});
 }
 if(req.method==='POST'&&b.action==='unblock'){if(!Number.isFinite(Date.parse(b.startsAt)))return json(res,400,{error:'Invalid slot.'});await sql`DELETE FROM interview_blocks WHERE starts_at=${b.startsAt}`;return json(res,200,{unblocked:true})}
 if(req.method==='PATCH'){
  if(!/^[0-9a-f-]{36}$/i.test(b.id||''))return json(res,400,{error:'Invalid booking reference.'});let rows;
  if(b.action==='cancel'){rows=await sql`UPDATE interview_bookings SET status='cancelled',cancelled_at=now() WHERE id=${b.id} AND status='confirmed' AND starts_at>now() RETURNING id`}
  else if(b.action==='meeting'){if(typeof b.url!=='string'||b.url.length>1000||meetingURL(b.url)===null)return json(res,400,{error:'Enter a valid HTTPS meeting link.'});rows=await sql`UPDATE interview_bookings SET meeting_url=${meetingURL(b.url)} WHERE id=${b.id} AND status='confirmed' RETURNING id`}
  else return json(res,400,{error:'Unknown action.'});
  if(!rows.length)return json(res,404,{error:'Active booking not found.'});return json(res,200,{updated:true});
 }
 return json(res,405,{error:'Method not allowed'});
 }catch(e){return failure(res,e)}}
