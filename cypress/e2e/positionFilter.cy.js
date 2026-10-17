/* eslint-env mocha */
/* global cy, Cypress, expect */
// "Filter by position" on the records list — sxar/records-web#2.
// Runs against the dev server, which proxies /record to records-api.

const LIST_REQUEST = { method: 'GET', url: /\/record\/?(\?.*)?$/ };

// Records every list request's position query (null when absent), in order.
function trackListRequests() {
  const positions = [];
  cy.intercept(LIST_REQUEST, (req) => {
    positions.push(req.query.position ?? null);
  }).as('list');
  return positions;
}

function matching(records, text) {
  return records.filter((r) =>
    String(r.position ?? '').toLowerCase().includes(text.toLowerCase()),
  );
}

function createRecord(record) {
  return cy.request('POST', '/record', record).its('body.insertedId');
}

function rows() {
  return cy.get('table tbody tr');
}

describe('Records list position filter', () => {
  beforeEach(() => {
    cy.request('/record').its('body').as('allRecords');
  });

  it('R5a shows a "Filter by position" text input above the table', () => {
    cy.visit('/');
    cy.contains('label', 'Filter by position').should('be.visible').and('have.attr', 'for', 'positionFilter');
    cy.get('#positionFilter').should('be.visible').and('have.attr', 'type', 'text').and('have.value', '');
    cy.get('#positionFilter').then(($input) => {
      const table = Cypress.$('table')[0];
      expect($input[0].compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).to.be.greaterThan(0);
    });
  });

  it('R5b shows all records while the filter is empty', function () {
    cy.visit('/');
    rows().should('have.length', this.allRecords.length);
    rows().should('contain', 'Alice Johnson').and('contain', 'Carol Lee');
  });

  it('R6a typing re-fetches with ?position= and shows only matching records', function () {
    const positions = trackListRequests();
    cy.visit('/');
    rows().should('have.length', this.allRecords.length);
    cy.get('#positionFilter').type('engineer');
    cy.wrap(positions).should('include', 'engineer');
    rows().should('have.length', matching(this.allRecords, 'engineer').length);
    rows().should('have.length', 5);
    rows().each(($tr) => {
      expect($tr.find('td').eq(1).text().toLowerCase()).to.contain('engineer');
    });
    cy.get('table tbody').should('not.contain', 'Carol Lee');
  });

  it('R6b re-fetches on every keystroke without submitting', () => {
    const positions = trackListRequests();
    cy.visit('/');
    rows().should('have.length.greaterThan', 0);
    cy.get('#positionFilter').type('Dev');
    cy.wrap(positions).should('include', 'D').and('include', 'De').and('include', 'Dev');
    rows().should('have.length', 3);
    cy.get('table tbody tr td:nth-child(2)').then(($cells) => {
      expect([...$cells].map((c) => c.innerText.trim()).sort()).to.deep.equal(
        ['Backend Developer', 'DevOps Engineer', 'Frontend Developer'],
      );
    });
  });

  it('R6c URL-encodes special characters so the API gets the literal text', () => {
    createRecord({ name: 'Plus', position: 'C++ (L2)', level: 'Junior' }).then((id) => {
      cy.intercept(LIST_REQUEST).as('list');
      cy.visit('/');
      rows().should('have.length.greaterThan', 0);
      cy.get('#positionFilter').type('C++ (L2)');
      // Earlier keystrokes also fetch; retry until the full value has gone out.
      cy.get('@list.all').should((calls) => {
        const last = calls[calls.length - 1].request;
        expect(last.query.position).to.equal('C++ (L2)');
        expect(last.url).to.contain('position=C%2B%2B%20(L2)');
      });
      rows().should('have.length', 1).and('contain', 'Plus');
      cy.request('DELETE', `/record/${id}`);
    });
  });

  it('R6d a filter with no matches leaves no rows', () => {
    cy.visit('/');
    rows().should('have.length.greaterThan', 0);
    cy.get('#positionFilter').type('zzzznomatch');
    rows().should('have.length', 0);
  });

  it('R6e a slow response for an earlier prefix does not replace the latest results', function () {
    cy.intercept({ ...LIST_REQUEST, query: { position: 'E' } }, (req) => {
      req.on('response', (res) => {
        res.setDelay(1500);
      });
    }).as('slowE');
    cy.visit('/');
    rows().should('have.length', this.allRecords.length);
    cy.get('#positionFilter').type('En');
    cy.get('#positionFilter').type('gineer');
    cy.wait('@slowE');
    cy.wait(500);
    rows().should('have.length', matching(this.allRecords, 'engineer').length);
    rows().each(($tr) => {
      expect($tr.find('td').eq(1).text().toLowerCase()).to.contain('engineer');
    });
  });

  it('R7a clearing the filter re-fetches without position and shows all records', function () {
    const positions = trackListRequests();
    cy.visit('/');
    cy.get('#positionFilter').type('engineer');
    rows().should('have.length', 5);
    cy.get('#positionFilter').clear();
    cy.wrap(positions).should((p) => {
      expect(p[p.length - 1]).to.equal(null);
    });
    rows().should('have.length', this.allRecords.length);
  });

  it('R7b whitespace-only input shows all records', function () {
    cy.visit('/');
    cy.get('#positionFilter').type('engineer');
    rows().should('have.length', 5);
    cy.get('#positionFilter').clear().type('   ');
    rows().should('have.length', this.allRecords.length);
  });

  it('R8a deleting a row while filtered removes it and keeps the filter applied', () => {
    createRecord({ name: 'Keeper Z', position: 'Zebra Keeper', level: 'Junior' }).as('keeperId');
    createRecord({ name: 'Trainer Z', position: 'Zebra Trainer', level: 'Junior' }).as('trainerId');
    cy.visit('/');
    cy.get('#positionFilter').type('zebra');
    rows().should('have.length', 2);
    cy.contains('tr', 'Zebra Keeper').within(() => {
      cy.contains('button', 'Delete').click();
    });
    rows().should('have.length', 1).and('contain', 'Zebra Trainer');
    cy.get('table tbody').should('not.contain', 'Zebra Keeper');
    cy.get('@keeperId').then((keeperId) => {
      cy.request('/record').its('body').should((all) => {
        expect(all.map((r) => r._id)).not.to.include(keeperId);
      });
    });
    cy.get('@trainerId').then((trainerId) => cy.request('DELETE', `/record/${trainerId}`));
  });

  it('R8b a record created on /create is listed and found by a matching filter', () => {
    cy.visit('/create');
    cy.get('#name').type('FilterEmp');
    cy.get('#position').type('Walrus Wrangler');
    cy.get('#positionIntern').click({ force: true });
    cy.get('[type="submit"]').click({ force: true });
    cy.visit('/');
    cy.contains('tr', 'FilterEmp').should('exist');
    cy.get('#positionFilter').type('walrus');
    rows().should('have.length', 1).and('contain', 'FilterEmp');
    cy.contains('tr', 'FilterEmp').within(() => {
      cy.contains('button', 'Delete').click();
    });
    rows().should('have.length', 0);
  });
});
