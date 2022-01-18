const request = require("supertest");
const app = require("../app");

describe("Integration Test for the API", () => {
  describe("GET /", () => {
    it("should response 200", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /status", () => {
    it("should response 200", async () => {
      const res = await request(app).get("/status");
      expect(res.statusCode).toEqual(200);
      console.log("res.body", res.body);
      expect(res.body).toHaveProperty("status", "api", "time");
    });
  });
});
