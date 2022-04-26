import { useState, FormEvent } from "react";

export default () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = { email: email, password: password };
    const url = "/api/users/signup";

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    });

    const responseObject = await response.json();
    console.log(responseObject);
  };
  return (
    <form onSubmit={onSubmit}>
      <h1>Signup</h1>
      <div>
        <label>Email Address</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)}></input>
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button>Signup</button>
    </form>
  );
};
