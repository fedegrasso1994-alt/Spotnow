// Fixtures for the interface preview only. Replace with the server adapter for the pilot.
const colors = ['#ff4f64', '#3ddc97', '#ffb238', '#8c7bff', '#3dc7dc'];
export const people = [
  ['Giulia',24,8,'👩🏻','F'],['Luca',29,15,'👨🏽','M'],
  ['Sara',26,22,'👩🏾','F'],['Marco',31,4,'🧔🏻','M'],
  ['Elena',23,95,'👩🏼','F'],['Davide',28,110,'👨🏻','M'],
  ['Chiara',25,130,'👩🏽','F'],['Andrea',30,150,'👨🏾','M'],
].map(([name,age,checkedIn,face,gender],index) => ({id:index+1,name,age,checkedIn,face,gender,color:colors[index%colors.length],mutual:index===0}));
