/**
 * Supabase 클라이언트 초기화
 */
class SupabaseClientFactory {
  static isConfigured() {
    return Boolean(
      typeof SUPABASE_CONFIG !== 'undefined' &&
        SUPABASE_CONFIG.url &&
        SUPABASE_CONFIG.publishableKey
    );
  }

  static getConfigError() {
    if (typeof SUPABASE_CONFIG === 'undefined') {
      return 'supabase-config.js 가 로드되지 않았습니다.';
    }
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.publishableKey) {
      return 'Supabase URL과 publishable key를 supabase-config.js에 설정해 주세요.';
    }
    return null;
  }

  static create() {
    const configError = SupabaseClientFactory.getConfigError();
    if (configError) {
      throw new Error(configError);
    }

    if (typeof supabase === 'undefined' || !supabase.createClient) {
      throw new Error('@supabase/supabase-js 라이브러리가 로드되지 않았습니다.');
    }

    return supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
  }
}
