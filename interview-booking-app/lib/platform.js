import {createClerkClient} from '@clerk/backend';
import {neon} from '@neondatabase/serverless';
export const publishableKey=()=>process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||process.env.CLERK_PUBLISHABLE_KEY||'';
export const configured=()=>Boolean(publishableKey()&&process.env.CLERK_SECRET_KEY&&process.env.DATABASE_URL);
export function db(){return neon(process.env.DATABASE_URL)}
export function json(res,status,data){res.setHeader('Cache-Control','no-store');return res.status(status).json(data)}
export function origins(){return [...new Set(['https://kushal-interview-studio.vercel.app',process.env.VERCEL_URL&&'https://'+process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL&&'https://'+process.env.VERCEL_BRANCH_URL,...(process.env.APP_ORIGINS||'').split(',')].filter(Boolean))]}
export async function identity(req){
 if(!publishableKey()||!process.env.CLERK_SECRET_KEY)throw Object.assign(new Error('Student sign-in setup is not complete.'),{status:503});
 const bearer=req.headers.authorization;if(!bearer?.startsWith('Bearer '))throw Object.assign(new Error('Please sign in to continue.'),{status:401});
 if(req.method!=='GET'&&!origins().includes(req.headers.origin))throw Object.assign(new Error('Request origin is not allowed.'),{status:403});
 const client=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY,publishableKey:publishableKey()});
 const request=new Request(origins()[0]+req.url,{headers:{authorization:bearer}});
 const state=await client.authenticateRequest(request,{authorizedParties:origins(),acceptsToken:'session_token'});
 if(!state.isAuthenticated)throw Object.assign(new Error('Your session has expired. Sign in again.'),{status:401});
 const auth=state.toAuth();const user=await client.users.getUser(auth.userId);
 const email=user.emailAddresses.find(e=>e.id===user.primaryEmailAddressId&&e.verification?.status==='verified')?.emailAddress;
 if(!email)throw Object.assign(new Error('Verify your email address before booking.'),{status:403});
 return {id:auth.userId,email,name:[user.firstName,user.lastName].filter(Boolean).join(' '),instructor:user.privateMetadata?.role==='instructor'||auth.userId===process.env.INSTRUCTOR_CLERK_USER_ID};
}
export function body(req){if(typeof req.body==='string'){if(req.body.length>8000)throw Object.assign(new Error('Request too large.'),{status:413});return JSON.parse(req.body)}if(Buffer.byteLength(JSON.stringify(req.body||{}))>8000)throw Object.assign(new Error('Request too large.'),{status:413});return req.body||{}}
export function failure(res,e){console.error('booking_route_error',{code:e.code||e.status||'unknown'});return json(res,e.status||503,{error:e.status?e.message:'The booking service is temporarily unavailable. Please try again.'})}
