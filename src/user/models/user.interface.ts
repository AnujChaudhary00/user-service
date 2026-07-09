export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IUserRepository {
  create(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  searchByEmail(query: string): Promise<User[]>;
  update(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User | null>;
  remove(id: string): Promise<void>;
}
