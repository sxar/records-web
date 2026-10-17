/* global cy, describe, expect, it */

// The dev-server proxy (vite.config.js) must pass ?position= through to records-api.
const apiUrl = 'http://localhost:5050';
const sortedIds = (records) => records.map((r) => r._id).sort();

describe('Record position filter through the web proxy', () => {
  it('R1k: /record?position=engineer matches the API directly', () => {
    cy.request(`${apiUrl}/record?position=engineer`).then((api) => {
      expect(api.body).to.have.length.of.at.least(5);
      cy.request('/record?position=engineer').then((web) => {
        expect(web.status).to.eq(200);
        expect(sortedIds(web.body)).to.deep.eq(sortedIds(api.body));
      });
    });
  });
});
