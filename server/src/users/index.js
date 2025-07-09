import { NotFoundError } from "./error-handling.js"

export async function registerUser(getUsers, saveUser, user) {
    const users = await getUsers()
    
    const { name } = user
    const isThereDuplicateUser = users.find(x => x.name === name)

    if (isThereDuplicateUser) {
        throw new Error(`User with same name: "${name}", already exists!`)
    }
    await saveUser(moto)
}
