/// Configuration values for networking and backend connections.
class ApiConfig {
  const ApiConfig({
    this.baseUrl = const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:3000',
    ),
    this.supabaseUrl = const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: '',
    ),
    this.supabaseAnonKey = const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: '',
    ),
  });

  final String baseUrl;
  final String supabaseUrl;
  final String supabaseAnonKey;

  static const ApiConfig development = ApiConfig();
}
