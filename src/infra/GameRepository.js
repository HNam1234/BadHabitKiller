/**
 * Infrastructure Layer: Repository abstraction
 * GameService depends on this interface so LocalStorageRepository can be swapped
 * for an ApiRepository later without changing core logic.
 */
export class GameRepository {
  // eslint-disable-next-line class-methods-use-this
  async load() {
    throw new Error("GameRepository.load() not implemented.");
  }

  // eslint-disable-next-line class-methods-use-this
  async save(_state) {
    throw new Error("GameRepository.save(state) not implemented.");
  }
}

