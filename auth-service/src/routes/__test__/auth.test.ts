import request from "supertest";
import { app } from "../../app";

describe("sign up functionality", () => {
  test("returns a 201 on successful signup", async () => {
    const data = {
      email: "test@test.com",
      password: "password",
    };

    const response = await request(app).post("/api/users/signup").send(data);

    expect(response.status).toEqual(201);
  });

  test("returns a 400 with an invalid email", async () => {
    return request(app)
      .post("/api/users/signup")
      .send({
        email: "alskdflaskjfd",
        password: "password",
      })
      .expect(400);
  });

  test("returns a 400 with an invalid password", async () => {
    return request(app)
      .post("/api/users/signup")
      .send({
        email: "alskdflaskjfd",
        password: "p",
      })
      .expect(400);
  });

  test("returns a 400 with missing email and password", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
      })
      .expect(400);

    await request(app)
      .post("/api/users/signup")
      .send({
        password: "alskjdf",
      })
      .expect(400);
  });

  test("disallows duplicate emails", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(201);

    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(400);
  });

  test("sets a cookie after successful signup", async () => {
    const response = await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(201);

    expect(response.get("Set-Cookie")).toBeDefined();
  });
});
