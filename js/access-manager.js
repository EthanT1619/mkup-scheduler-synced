/**
 * allowlist 접근 권한 확인 — is_scheduler_user RPC
 */
class AccessManager {
  static RPC = 'is_scheduler_user';

  constructor(supabaseClient) {
    this.client = supabaseClient;
  }

  static toErrorMessage(error, fallback) {
    if (!error) return fallback;
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    }
    if (error.code === 'PGRST202') {
      return '접근 권한 확인 함수가 아직 설정되지 않았습니다. access-control-setup.sql 을 적용해 주세요.';
    }
    return error.message || fallback;
  }

  /**
   * @returns {Promise<{ status: 'allowed' | 'denied' | 'error', message?: string }>}
   */
  async checkAccess() {
    try {
      const { data, error } = await this.client.rpc(AccessManager.RPC);

      if (error) {
        return {
          status: 'error',
          message: AccessManager.toErrorMessage(error, '접근 권한을 확인하지 못했습니다.'),
        };
      }

      if (data === true) {
        return { status: 'allowed' };
      }

      return { status: 'denied' };
    } catch (err) {
      return {
        status: 'error',
        message: AccessManager.toErrorMessage(err, '접근 권한을 확인하지 못했습니다.'),
      };
    }
  }
}
