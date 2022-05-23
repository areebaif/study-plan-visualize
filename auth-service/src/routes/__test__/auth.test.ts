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

describe("sign out functionality", () => {
  test("clears the cookie after signing out", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(201);

    const response = await request(app)
      .post("/api/users/signout")
      .send({})
      .expect(200);

    expect(response.get("Set-Cookie")[0]).toEqual(
      "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly"
    );
  });
});

describe("sign in functionality", () => {
  test("fails when a email that does not exist is supplied", async () => {
    await request(app)
      .post("/api/users/signin")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(400);
  });

  test("fails when an incorrect password is supplied", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(201);

    await request(app)
      .post("/api/users/signin")
      .send({
        email: "test@test.com",
        password: "aslkdfjalskdfj",
      })
      .expect(400);
  });

  test("responds with a cookie when given valid credentials", async () => {
    await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(201);

    const response = await request(app)
      .post("/api/users/signin")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(200);

    expect(response.get("Set-Cookie")).toBeDefined();
  });
});

describe("current user functionality", () => {
  // TODO: req.currentUser is being undefined. Currentuser file os not being executed
  test("responds with details about the current user", async () => {
    const authResponse = await request(app)
      .post("/api/users/signup")
      .send({
        email: "test@test.com",
        password: "password",
      })
      .expect(201);
    const cookie = authResponse.get("Set-Cookie");

    const response = await request(app)
      .get("/api/users/currentuser")
      .set("Cookie", cookie)
      .send()
      .expect(200);
    expect(response.body.currentUser.email).toEqual("test@test.com");
  });
});
