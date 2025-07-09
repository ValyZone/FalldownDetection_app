export async function saveUser(getUsers, saveUser, user) {
    const motos = await loadMotos()
    
    const { id } = note
    const duplicateMoto = motos.find((moto) => moto.id === id)

    if (duplicateMoto) {
        throw new Error(`Moto with id "${id}" already exists!`)
    }

    motos.push(moto)
    await saveMotos(motos)
}