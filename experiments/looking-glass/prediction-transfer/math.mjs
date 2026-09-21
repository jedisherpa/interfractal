// Exact service-side verification helpers. The browser never imports this module.
export function q(value){
  if(typeof value!=='string'||!(/^-?\d+(?:\/[1-9]\d*)?$/.test(value)))throw Error('Invalid rational');
  const [a,b='1']=value.split('/');let n=BigInt(a),d=BigInt(b);if(d<=0n)throw Error('Invalid denominator');
  const gcd=(x,y)=>{x=x<0n?-x:x;while(y)[x,y]=[y,x%y];return x||1n;};
  const g=gcd(n,d);return {n:n/g,d:d/g};
}
export function str(v){return v.n===0n?'0':v.d===1n?String(v.n):`${v.n}/${v.d}`;}
export const add=(a,b)=>q(str({n:a.n*b.d+b.n*a.d,d:a.d*b.d}));
export const neg=a=>({n:-a.n,d:a.d});
export const sub=(a,b)=>add(a,neg(b));
export const mul=(a,b)=>q(str({n:a.n*b.n,d:a.d*b.d}));
export const div=(a,b)=>{if(b.n===0n)throw Error('Zero division');const sign=b.n<0n?-1n:1n;return q(str({n:a.n*b.d*sign,d:a.d*b.n*sign}));};
export const sq=a=>mul(a,a);
export function pointObserve(source,query){
  const [x,y,z,w]=source.map(q),c=q(query.cos),s=q(query.sin);
  return [str(sub(mul(c,x),mul(s,w))),str(y),str(z)];
}
export function ballSlice(centerW,radiusSquared,setting){
  const delta=sub(q(radiusSquared),sq(sub(q(setting),q(centerW))));
  if(delta.n<0n)return {kind:'empty',center:null,delta:str(delta),radiusSquared:null,radius:null};
  if(delta.n===0n)return {kind:'point',center:['0','0','0'],delta:'0',radiusSquared:'0',radius:'0'};
  return {kind:'ball',center:['0','0','0'],delta:str(delta),radiusSquared:str(delta)};
}
export function solveBall(supports){
  if(!Array.isArray(supports)||supports.length!==2)throw Error('Two supports required');
  const [a,b]=supports,s1=q(a.sliceSetting),s2=q(b.sliceSetting),r1=q(a.radiusSquared),r2=q(b.radiusSquared);
  const centerW=div(add(sub(r2,r1),sub(sq(s2),sq(s1))),mul(q('2'),sub(s2,s1)));
  const radiusSquared=add(r1,sq(sub(s1,centerW)));
  if(radiusSquared.n<0n)throw Error('Invalid source ball');
  return {centerW:str(centerW),radiusSquared:str(radiusSquared)};
}
