const nativeFloor = Math.floor
const seedrandom = Math.seedrandom

function baseRandom(lower, upper, seed) {
  const nativeRandom = seedrandom(seed)
  return lower + nativeFloor(nativeRandom() * (upper - lower + 1))
}

function arrayShuffle(array, seed) {
  return shuffleSelf(copyArray(array), undefined, seed)
}

function copyArray(source, array) {
  let index = -1
  const length = source.length

  array || (array = Array(length))
  while (++index < length) {
    array[index] = source[index]
  }
  return array
}

function shuffleSelf(array, size, seed) {
  let index = -1
  const length = array.length
  const lastIndex = length - 1

  size = size === undefined ? length : size
  while (++index < size) {
    const rand = baseRandom(index, lastIndex, seed),
      value = array[rand]

    array[rand] = array[index]
    array[index] = value
  }
  array.length = size
  return array
}

window.multipleChoiceAssessment = window.multipleChoiceAssessment || {}
window.multipleChoiceAssessment.shuffle = arrayShuffle
