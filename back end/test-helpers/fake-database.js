/* ===========================================================
   A tiny stand-in for the MySQL pool, used by the unit tests.

   Why: the real pool needs a MySQL server running. The tests
   should pass on any machine right after "npm install", so
   they hand this object to the module instead.

   It does two things:
     - remembers every query it was given, so a test can check
       the SQL and the values we sent
     - hands back whatever the test lined up with willReturn()

   mysql2 answers every query with [result, fields], so this
   returns an array of two things as well.
   =========================================================== */

function fakeDatabase() {
  const calls = [];
  const answers = [];

  return {
    /* every { sql, values } this fake was asked to run */
    calls: calls,

    /* line up what the next query should hand back:
         willReturn([ row, row ])      for a SELECT
         willReturn({ insertId: 3 })   for an INSERT  */
    willReturn: function (answer) {
      answers.push(answer);
    },

    /* the only method our modules call on the pool */
    execute: async function (sql, values) {
      calls.push({ sql: sql, values: values });

      const next = answers.shift();

      return [next === undefined ? [] : next, []];
    },

    /* the last query, which is what most tests want to look at */
    lastCall: function () {
      return calls[calls.length - 1];
    }
  };
}

module.exports = fakeDatabase;
