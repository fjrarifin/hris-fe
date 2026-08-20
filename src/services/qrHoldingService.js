import axios from 'axios'
import { backendUrl } from './api'

export function generatePublicHoldingQr(nik) {
  return axios.post(`${backendUrl}/api/public/qr-holding/validate-and-generate`, { nik })
}
