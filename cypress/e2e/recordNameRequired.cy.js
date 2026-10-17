/* eslint-env mocha */
/* global cy, expect */

// The record form must refuse to save a record with an empty name and show
// "Name is required" under the Name field, while any non-empty name is
// accepted as before and the Position-required check keeps working.

const NAME_ERROR = /Name is required/;
const POSITION_ERROR = /Position is required/;

// Every record these tests create carries one of these positions or names,
// so afterEach can remove them even when a test fails midway.
const TEST_POSITION = /^Pos-(R\d|F1)/;
const TEST_NAME = /^R\d[a-z]? /;

function fieldContainer(selector) {
  return cy.get(selector).closest('.sm\\:col-span-4');
}

function submit() {
  cy.get('input[type=submit]').click();
}

function seedRecord(record) {
  return cy.request('POST', '/record', record).its('body.insertedId');
}

function visitEdit(id, name) {
  cy.visit(`/edit/${id}`);
  cy.get('#name').should('have.value', name);
}

describe('Record form: name is required', () => {
  beforeEach(() => {
    cy.intercept('POST', '/record').as('create');
    cy.intercept('PATCH', '/record/*').as('patch');
  });

  afterEach(() => {
    cy.request('GET', '/record').then(({ body }) => {
      body
        .filter((r) => TEST_POSITION.test(r.position) || TEST_NAME.test(r.name))
        .forEach((r) => cy.request('DELETE', `/record/${r._id}`));
    });
  });

  describe('empty name is refused (R1)', () => {
    it('R1a: does not POST and stays on /create when name is empty', () => {
      cy.request('GET', '/record').then(({ body: before }) => {
        cy.visit('/create');
        cy.get('#position').type('Pos-R1a');
        cy.get('#positionIntern').click({ force: true });
        submit();

        cy.location('pathname').should('eq', '/create');
        cy.get('@create.all').should('have.length', 0);
        cy.request('GET', '/record').then(({ body: after }) => {
          expect(after).to.have.length(before.length);
          expect(after.map((r) => r.position)).not.to.include('Pos-R1a');
        });
      });
    });

    it('R1a: an empty-name submit leaves the record list unchanged', () => {
      cy.request('GET', '/record').then(({ body: before }) => {
        cy.visit('/create');
        cy.get('#position').type('Pos-R1a2');
        submit();
        cy.contains(NAME_ERROR).should('be.visible');

        cy.visit('/');
        cy.contains('h3', 'Employee Records').should('be.visible');
        cy.contains('tr', 'Pos-R1a2').should('not.exist');
        cy.request('GET', '/record').its('body').should('have.length', before.length);
      });
    });

    it('R1b: shows "Name is required" under the Name field only', () => {
      cy.visit('/create');
      cy.get('#position').type('Pos-R1b');
      cy.get('#positionIntern').click({ force: true });
      submit();

      fieldContainer('#name').contains(NAME_ERROR).should('be.visible');
      fieldContainer('#position').contains(NAME_ERROR).should('not.exist');
    });

    it('R1c: edit page does not PATCH when the name is cleared', () => {
      seedRecord({ name: 'R1c Original', position: 'P', level: 'Junior' }).then((id) => {
        visitEdit(id, 'R1c Original');
        cy.get('#name').clear();
        submit();

        cy.location('pathname').should('eq', `/edit/${id}`);
        fieldContainer('#name').contains(NAME_ERROR).should('be.visible');
        cy.get('@patch.all').should('have.length', 0);
        cy.request('GET', `/record/${id}`).its('body.name').should('eq', 'R1c Original');
      });
    });

    it('R1d: untouched form is refused and shows the name error', () => {
      cy.visit('/create');
      submit();

      cy.location('pathname').should('eq', '/create');
      fieldContainer('#name').contains(NAME_ERROR).should('be.visible');
      cy.get('@create.all').should('have.length', 0);
    });

    it('R1e: typing a name clears the error and the next submit saves', () => {
      cy.visit('/create');
      cy.get('#position').type('Pos-R1e');
      cy.get('#positionSenior').click({ force: true });
      submit();
      cy.contains(NAME_ERROR).should('be.visible');

      cy.get('#name').type('R1e Person');
      cy.contains(NAME_ERROR).should('not.exist');

      submit();
      cy.wait('@create').its('response.statusCode').should('eq', 200);
      cy.location('pathname').should('eq', '/');
      cy.contains('tr', 'R1e Person').should('be.visible');
      cy.get('@create.all').should('have.length', 1);
    });
  });

  describe('non-empty names are accepted as before (R2)', () => {
    it('R2a: saves an ordinary name', () => {
      cy.visit('/create');
      cy.get('#name').type('R2a Employee');
      cy.get('#position').type('Pos-R2a');
      cy.get('#positionJunior').click({ force: true });
      submit();

      cy.wait('@create').then(({ request, response }) => {
        expect(request.body.name).to.eq('R2a Employee');
        cy.request('GET', `/record/${response.body.insertedId}`)
          .its('body.name')
          .should('eq', 'R2a Employee');
      });
      cy.location('pathname').should('eq', '/');
      cy.contains('tr', 'R2a Employee').should('be.visible');
      cy.contains(NAME_ERROR).should('not.exist');
    });

    it('R2b: accepts a one-character name', () => {
      cy.visit('/create');
      cy.get('#name').type('X');
      cy.get('#position').type('Pos-R2b');
      submit();

      cy.wait('@create').its('request.body.name').should('eq', 'X');
      cy.location('pathname').should('eq', '/');
      cy.contains(NAME_ERROR).should('not.exist');
    });

    it('R2c: sends a unicode name with surrounding spaces as typed', () => {
      cy.visit('/create');
      cy.get('#name').type('  Zoë Ünal ');
      cy.get('#position').type('Pos-R2c');
      submit();

      cy.wait('@create').its('request.body.name').should('eq', '  Zoë Ünal ');
      cy.location('pathname').should('eq', '/');
    });

    // Defect F1: the check trims the name, so a whitespace-only name, which is
    // non-empty and was saved before this change, is now rejected.
    it('R2d / whitespace-only-name-accepted: accepts a whitespace-only name', () => {
      cy.visit('/create');
      cy.get('#name').type('   ');
      cy.get('#position').type('Pos-F1');
      cy.get('#positionIntern').click({ force: true });
      submit();

      cy.wait('@create', { timeout: 4000 }).its('request.body.name').should('eq', '   ');
      cy.location('pathname').should('eq', '/');
      cy.contains(NAME_ERROR).should('not.exist');
    });

    it('R2e: edit saves a changed non-empty name via PATCH', () => {
      seedRecord({ name: 'R2e Old', position: 'P', level: 'Intern' }).then((id) => {
        visitEdit(id, 'R2e Old');
        cy.get('#name').clear().type('R2e New');
        submit();

        cy.wait('@patch');
        cy.location('pathname').should('eq', '/');
        cy.request('GET', `/record/${id}`).its('body').should((record) => {
          expect(record.name).to.eq('R2e New');
          expect(record.position).to.eq('P');
        });
      });
    });

    it('R2f: edit accepts the pre-filled name untouched', () => {
      seedRecord({ name: 'R2f Keep', position: 'P', level: 'Senior' }).then((id) => {
        visitEdit(id, 'R2f Keep');
        cy.get('#position').clear().type('R2f Pos');
        submit();

        cy.wait('@patch');
        cy.location('pathname').should('eq', '/');
        cy.request('GET', `/record/${id}`).its('body').should((record) => {
          expect(record.name).to.eq('R2f Keep');
          expect(record.position).to.eq('R2f Pos');
          expect(record.level).to.eq('Senior');
        });
      });
    });
  });

  describe('position is still required (R3)', () => {
    it('R3a: valid name with empty position shows only the position error', () => {
      cy.visit('/create');
      cy.get('#name').type('R3a Person');
      submit();

      cy.location('pathname').should('eq', '/create');
      fieldContainer('#position').contains(POSITION_ERROR).should('be.visible');
      cy.contains(NAME_ERROR).should('not.exist');
      cy.get('@create.all').should('have.length', 0);
    });

    it('R3b: a later submit with a name clears the name error', () => {
      cy.visit('/create');
      submit();
      cy.contains(NAME_ERROR).should('be.visible');

      cy.get('#name').type('R3b');
      submit();

      cy.contains(NAME_ERROR).should('not.exist');
      fieldContainer('#position').contains(POSITION_ERROR).should('be.visible');
      cy.get('@create.all').should('have.length', 0);
    });
  });
});
