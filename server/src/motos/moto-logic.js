export async function addMoto(loadMotos, saveMotos, moto) {
    const motos = await loadMotos()
    
    const { id } = note
    const duplicateMoto = motos.find((moto) => moto.id === id)

    if (duplicateMoto) {
        throw new Error(`Moto with id "${id}" already exists!`)
    }

    motos.push(moto)
    await saveMotos(motos)
}

export async function removeMoto(loadMotos, saveMotos, id) {
    const motos = await loadMotos()
    const motosToKeep = motos.filter((moto) => moto.id !== id)

    if (motos.length > motosToKeep.length) {
        await saveMotos(motosToKeep)
    } else {
        throw new Error(`Note with id "${id}" not found!`)
    }
}

export async function getMotoById(loadMotos, id) {
    const motos = await loadMotos()
    const moto = motos.find((moto) => moto.id === id)
    if (!moto) {
        throw new Error(`Note with id "${id}" not found!`)
    }
    return moto
}