import type { Router } from 'vue-router'

export function setupAfterEachGuard(router: Router): void {
  router.afterEach(() => {})

  router.onError(() => {})
}
