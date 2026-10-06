"use client";

import { useActionState, useEffect } from "react";
import { logoutUser } from "../actions/auth.actions";
import { toast } from "sonner";

const LogoutButton = () => {
  const [state, formAction] = useActionState(logoutUser, {
    success: false,
    message: "",
  });

  useEffect(() => {
    if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <button
        type="submit"
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
      >
        Logout
      </button>
    </form>
  );
};

export default LogoutButton;
