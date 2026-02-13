import api from "../api/axios";

export const getListings = async () => {
  const res = await api.get("/listings/search");

  console.log("API RESPONSE:", res.data); // debug

  return res.data.items; // return array only
};
