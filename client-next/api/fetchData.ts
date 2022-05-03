// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import type { NextApiRequest, NextApiResponse } from "next";

// type Data = {
//   name: string;
// };

// export default function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<Data>
// ) {
//   res.status(200).json({ name: "John Doe" });
// }

export async function fetchData<T>(
  url: string,
  method: string,
  body?: string,
  cookie?: string
) {
  const isCookie = cookie ? cookie : "";
  const response = await fetch(url, {
    method: method,
    body: body,
    headers: {
      "Content-Type": "application/json",
      cookie: isCookie,
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
