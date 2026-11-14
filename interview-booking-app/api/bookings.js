import {randomUUID} from 'node:crypto';import {identity,db,json,body,failure} from '../lib/platform.js';import {validateBooking} from '../lib/schedule.js';
export default async function handler(req,res){try{
 const user=await identity(req),sql=db();
 if(req.method==='GET'){const rows=await sql`SELECT * FROM interview_bookings WHERE student_id=${user.id} ORDER BY starts_at DESC LIMIT 100`;return json(res,200,{bookings:rows})}
 if(req.method==='POST'){
  const b=body(req),error=validateBooking(b);if(error)return json(res,400,{error});
  const results=await sql.transaction([
   sql`SELECT pg_advisory_xact_lock(431997)`,
   sql`INSERT INTO interview_bookings(id,student_id,student_name,student_email,starts_at,topic,experience,notes)
     SELECT ${randomUUID()},${user.id},${b.name.trim()},${user.email},${b.startsAt},${b.topic},${b.experience},${b.notes.trim()}
     WHERE NOT EXISTS(SELECT 1 FROM interview_blocks WHERE starts_at=${b.startsAt})
     AND (SELECT count(*) FROM interview_bookings WHERE student_id=${user.id} AND status='confirmed' AND starts_at>now())<3
     AND (SELECT count(*) FROM interview_bookings WHERE student_id=${user.id} AND created_at>now()-interval '1 hour')<10
     ON CONFLICT DO NOTHING RETURNING *`
  ],{isolationLevel:'ReadCommitted'});
  if(!results[1].length)return json(res,409,{error:'This slot is no longer available, or you reached the limit of 3 upcoming bookings or 10 booking attempts per hour. Refresh availability and check My interviews.'});
  return json(res,201,{booking:results[1][0]});
 }
 if(req.method==='DELETE'){
  const b=body(req);if(!/^[0-9a-f-]{36}$/i.test(b.id||''))return json(res,400,{error:'Invalid booking reference.'});
  const rows=await sql`UPDATE interview_bookings SET status='cancelled',cancelled_at=now() WHERE id=${b.id} AND student_id=${user.id} AND status='confirmed' AND starts_at>now() RETURNING id`;
  if(!rows.length)return json(res,404,{error:'No upcoming booking found to cancel.'});return json(res,200,{cancelled:true});
 }
 return json(res,405,{error:'Method not allowed'});
 }catch(e){return failure(res,e)}}
