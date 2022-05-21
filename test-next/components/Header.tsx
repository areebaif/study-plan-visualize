import Link from "next/link";
import { AuthApiReturnData } from "../types/types";

export const Header = ({ currentUser }: AuthApiReturnData) => {
  return (
    <nav>
      <Link href="/">
        <a>Home</a>
      </Link>
      <ul>
        <li>{currentUser ? "signout" : "signin/signup"}</li>
      </ul>
    </nav>
  );
};
