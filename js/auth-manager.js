/**
 * Google OAuth 로그인, 세션, 로그아웃
 */
class AuthManager {
  constructor() {
    this.client = null;
    this.user = null;
    this.ready = false;
    this.listeners = new Set();
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.user));
  }

  async init() {
    const configError = SupabaseClientFactory.getConfigError();
    if (configError) {
      this.ready = true;
      this.notify();
      return { configError };
    }

    this.client = SupabaseClientFactory.create();

    const { data, error } = await this.client.auth.getSession();
    if (error) {
      console.error('세션 확인 실패:', error);
    } else {
      this.user = data.session?.user ?? null;
    }

    this.client.auth.onAuthStateChange((_event, session) => {
      this.user = session?.user ?? null;
      this.notify();
    });

    this.ready = true;
    this.notify();
    return { configError: null };
  }

  isReady() {
    return this.ready;
  }

  isLoggedIn() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  getDisplayName() {
    if (!this.user) return '';
    return (
      this.user.user_metadata?.full_name ||
      this.user.user_metadata?.name ||
      this.user.email ||
      '사용자'
    );
  }

  getUserId() {
    return this.user?.id ?? null;
  }

  getClient() {
    return this.client;
  }

  getRedirectUrl() {
    return window.location.origin + window.location.pathname;
  }

  async signInWithGoogle() {
    if (!this.client) {
      throw new Error(SupabaseClientFactory.getConfigError() || 'Supabase가 설정되지 않았습니다.');
    }

    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: this.getRedirectUrl(),
      },
    });

    if (error) throw error;
  }

  async signOut() {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
}
