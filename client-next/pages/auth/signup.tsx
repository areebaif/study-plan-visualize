import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { AuthApiReturnData, ErrorInterface } from "../../types/types";
import { Errors } from "../../components/Errors";
import { route } from "next/dist/server/router";

async function fetchData<T>(url: string, method: string, body: string) {
  const response = await fetch(url, {
    method: method,
    body: body,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new TypeError("something went wrong with the backend request");
  }
  const responseObject: T = await response.json();
  return responseObject;
}

export default () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ErrorInterface[] | null>(null);
  const router = useRouter();
  const apiUrl = "/api/users/signup";
  const redirectUrl = "/";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = JSON.stringify({ email: email, password: password });

    try {
      setErrors(null);

      const response = await fetchData<AuthApiReturnData>(apiUrl, "POST", data);

      if (!response.errors) {
        router.push(redirectUrl);
      } else {
        setErrors(response.errors);
      }
    } catch (err) {
      console.log(err);
      if (err instanceof Error)
        setErrors([{ message: "something went wrong" }]);
    }
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
      {errors && <Errors message={errors} />}
      <button>Signup</button>
    </form>
  );
};
