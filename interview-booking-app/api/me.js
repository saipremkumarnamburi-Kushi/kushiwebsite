import {identity,json,failure} from '../lib/platform.js';
export default async function handler(req,res){try{if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});return json(res,200,await identity(req))}catch(e){return failure(res,e)}}
