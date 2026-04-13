import express from "express"
import { register, login, logout, refresh } from "../controller/auth_controller.js"

const auth_routes = express.Router()


auth_routes.post("/register", register)
auth_routes.post("/login", login)
auth_routes.post("/logout", logout)
auth_routes.post("/refresh", refresh)


export default auth_routes