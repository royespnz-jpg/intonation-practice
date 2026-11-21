// The teacher's Google Apps Script web app (google-apps-script/Code.gs), the
// URL that ends in /exec. A link with ?s=<url> (from the Teacher page) also
// sets it for the students who open it.
export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuj6OoPKiPpPpll-a4WJngwUMbzufnta391FspaOT0VrNnd2AIGrobBj8v_AkUyNbn/exec';

// A browser that saved one of these (from the Teacher page or a ?s= link)
// uses SCRIPT_URL instead: earlier deployments of this practice's script.
export const RETIRED_URLS = [];

// The code that opens the teacher pages (set-up, the sentences and the
// preview). It keeps students out of them during the practice; it is not a
// password: anyone who reads the page's code can find it.
export const TEACHER_CODE = '1234';

// The oldest google-apps-script/Code.gs this page works with (its doGet says
// which one is deployed).
export const SCRIPT_VERSION = 1;

// What the teacher's script calls itself (its doGet says it): the Teacher page
// uses it to tell this practice's script from another exam's.
export const SCRIPT_APP = 'Intonation Practice';
