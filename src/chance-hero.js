/** Decorative SOMA primitives only: never accepts or fetches candidate data. */
export function createChanceHero(doc){
 const hero=doc.createElement('div');hero.className='chance-introduction';hero.setAttribute('aria-hidden','true');
 const signal=doc.createElement('span');signal.className='chance-signal';hero.append(signal);return hero;
}
