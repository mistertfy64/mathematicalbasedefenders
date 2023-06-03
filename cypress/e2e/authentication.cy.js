describe("authentication", () => {
  it("should allow logging users in w/ correct credentials", () => {
    cy.visit("http://localhost:3000");
    cy.get("#main-menu-screen-button--settings").click();
    cy.get("#settings-screen__sidebar-item--online").click();
    cy.get("#settings-screen__content--online__username").type("mistertfy64water");
    cy.get("#settings-screen__content--online__password").type("password-mistertfy64water");
    cy.get("#settings-screen__content--online__submit").click();
    // shouldn't take longer than 1000ms
    cy.wait(1000);
    cy.get("#user-account-stat--username").should("have.text", "mistertfy64water");
  });

  it("should allow logging users in w/ incorrect credentials", () => {
    cy.visit("http://localhost:3000");
    cy.get("#main-menu-screen-button--settings").click();
    cy.get("#settings-screen__sidebar-item--online").click();
    cy.get("#settings-screen__content--online__username").type("mistertfy64water");
    cy.get("#settings-screen__content--online__password").type("password-mistertfy64water-incorrect");
    cy.get("#settings-screen__content--online__submit").click();
    // shouldn't take longer than 1000ms
    cy.wait(1000);
    cy.get("#user-account-stat--username").should("not.have.text", "mistertfy64water");
  });

  it("should allow logging users in w/ invalid credentials", () => {
    cy.visit("http://localhost:3000");
    cy.get("#main-menu-screen-button--settings").click();
    cy.get("#settings-screen__sidebar-item--online").click();
    cy.get("#settings-screen__content--online__username").type("<script>alert(1)</script>");
    cy.get("#settings-screen__content--online__password").type("password-mistertfy64water");
    cy.get("#settings-screen__content--online__submit").click();
    // shouldn't take longer than 1000ms
    cy.wait(1000);
    cy.get("#user-account-stat--username").should("not.have.text", "mistertfy64water");
  });
});
