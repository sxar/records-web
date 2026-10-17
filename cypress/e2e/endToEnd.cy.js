
describe('Web site availability', () => {

    after(() => {
      cy.visit('http://localhost:5173');
      cy.contains('tr', 'Employee1').within(() => {
        cy.contains("Delete").click({ force: true });
      });
      }); 
      it('Sanity listings web site', () => {
        cy.visit('http://localhost:5173');
        cy.contains('Create Employee').should('exist');
      });
      it('Test Adding Employee listings', () => {
        cy.visit('http://localhost:5173/create');
        cy.get('#name').type("Employee1");
        cy.get('#position').type("Position1");
        cy.get("#positionIntern").click({ force: true });
        cy.get('[type="submit"]').click({ force: true });
        cy.visit('http://localhost:5173');
        cy.contains('Employee1').should('exist');
      });
    });
