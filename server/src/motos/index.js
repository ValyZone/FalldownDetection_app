import { NotFoundError } from "./error-handling.js"

export async function addMoto(loadMotos, saveMoto, moto) {
    const motos = await loadMotos()
    
    const { model } = moto
    const duplicateMotos = motos.find((moto) => moto.model === model)

    if (duplicateMotos) {
        throw new Error(`Moto with model: "${model}", already exists!`)
    }
    await saveMoto(moto)
}

export async function removeMoto(loadMotos, saveMotos, model) {
    const motos = await loadMotos()
    const motosToKeep = motos.filter((moto) => moto.model !== model)

    if (motos.length > motosToKeep.length) {
        await saveMotos(motosToKeep)
    } else {
        throw new Error(`Moto with model name: "${model}", not found!`)
    }
}

export async function getMotoByModel(loadMotos, model) {
    const motos = await loadMotos()
    const moto = motos.find((moto) => moto.model === model)
    if (!model) {
        throw new NotFoundError(`Moto with model: "${model}", not found!`)
    }
    return moto
}
