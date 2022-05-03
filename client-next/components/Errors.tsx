import { ErrorInterface } from "../types/types";

export const Errors = (props: { message: ErrorInterface[] }) => {
  const { message } = props;
  return (
    <div>
      <h4>Ooops!!</h4>
      <ul>
        {message.map((err) => (
          <li key={err.message}>{err.message}</li>
        ))}
      </ul>
    </div>
  );
};
