export const HOUR = 60 * 60 * 1000;
export function validProfile(profile,{allowMissingPreference=false}={}) {
  return Boolean((profile.occupation===undefined||(typeof profile.occupation==='string'&&profile.occupation.trim().length<=80)) && (profile.photo||profile.photoPath) && typeof profile.name==='string' && profile.name.trim().length>=1 && profile.name.trim().length<=60 && Number.isInteger(profile.age) && profile.age>=18 && profile.age<=120 && ['M','F'].includes(profile.gender) && (['M','F','ALL'].includes(profile.preference)||(allowMissingPreference&&profile.preference===null)));
}
export const LIVE_WINDOW = 90 * 60 * 1000;
export function livePresence(checkedInAt, now=Date.now()){return now>=checkedInAt && now<checkedInAt+LIVE_WINDOW;}
export function liveMatch(match) {return !match.blocked;}
export function visiblePeople(people, preference) {
  return people.filter(person => !person.blocked && (preference === 'ALL' || person.gender === preference));
}
