import api from "../api/axios";

export async function getCities(countryCode) {
  const res = await api.get("/meta/cities", {
    params: countryCode ? { countryCode } : {}
  });
  return res.data?.items || [];
}
