/* global cy, describe, it */

// The list page calls GET /record/ with no query: it must still list every record.
const seededNames = [
  'Alice Johnson', 'Bob Martinez', 'Carol Lee', 'David Kim', 'Eva Nguyen',
  'Frank Chen', 'Grace Patel', 'Henry Okafor', 'Iris Müller', 'James Tanaka',
];

describe('Record list', () => {
  it('R2d: shows a row for every record, not only engineers', () => {
    cy.request('/record/').then(({ body }) => {
      cy.visit('/');
      ['Alice Johnson', 'Carol Lee', 'Eva Nguyen', 'Frank Chen'].forEach((name) => {
        cy.contains('tbody tr', name).should('be.visible');
      });
      seededNames.forEach((name) => cy.contains('tbody tr', name).should('exist'));
      cy.get('tbody tr').should('have.length', body.length);
    });
  });
});
