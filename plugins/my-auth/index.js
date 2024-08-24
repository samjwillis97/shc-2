exports["pre-request-hooks"] = {
  auth: () => {
    console.log("going to auth before request");
    return "";
  },
};
