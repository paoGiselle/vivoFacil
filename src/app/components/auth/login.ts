import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { VivoFacilService } from '../../services/vivofacil.service';
import { UserRole } from '../../models/vivofacil.models';

interface DemoProfile {
  label: string;
  nombre: string;
  correo: string;
  roles: UserRole[];
  estado: string;
  conjunto: string;
  vivienda: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      
      <!-- Main Login Form Card -->
      <div class="max-w-md mx-auto bg-white rounded-2xl border border-[#E1E2E9] shadow-md p-8">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-[#FE5615] text-white rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl shadow-sm mb-3">
            VF
          </div>
          <h2 class="text-2xl font-bold text-[#1A1A1A] tracking-tight">Iniciar Sesión</h2>
          <p class="text-xs text-[#637381] mt-1">Plataforma Digital de Administración de Accesos y Pagos</p>
        </div>

        @if (errorMessage) {
          <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span class="material-icons text-base">error_outline</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="login-email" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Correo Electrónico</label>
            <div class="relative">
              <span class="material-icons absolute left-3 top-2.5 text-[#637381] text-lg">email</span>
              <input 
                id="login-email"
                type="email" 
                formControlName="correo"
                placeholder="ejemplo@vivofacil.com"
                class="w-full pl-10 pr-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A] transition-colors"
              />
            </div>
          </div>

          <div>
            <label for="login-password" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Contraseña</label>
            <div class="relative">
              <span class="material-icons absolute left-3 top-2.5 text-[#637381] text-lg">lock</span>
              <input 
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'" 
                formControlName="password"
                (keydown)="onPasswordKeyDown($event)"
                placeholder="••••••••"
                class="w-full pl-10 pr-10 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A] transition-colors"
              />
              <button 
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-3 top-2.5 text-[#637381] hover:text-[#FE5615] focus:outline-none cursor-pointer"
                title="Mostrar / ocultar contraseña"
              >
                <span class="material-icons text-lg">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            [disabled]="loginForm.invalid"
            class="w-full py-2.5 bg-[#FE5615] text-white font-semibold rounded-xl hover:bg-[#e0470b] transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 mt-2"
          >
            <span>Ingresar</span>
            <span class="material-icons text-sm">arrow_forward</span>
          </button>
        </form>

        <!-- Register Link -->
        <div class="mt-6 text-center text-xs text-[#637381]">
          ¿Aún no tienes una cuenta registrada? 
          <button (click)="goToRegister.emit()" class="font-semibold text-[#FE5615] hover:underline ml-1">
            Crear cuenta nueva
          </button>
        </div>

      </div>

      <!-- Quick Demo Switcher (Required Mode Demo/Dev Section) -->
      <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9]">
          <div>
            <h3 class="text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
              <span class="material-icons text-[#FE5615] text-lg">science</span>
              <span>Acceso Rápido de Prueba (Demo)</span>
            </h3>
            <p class="text-[11px] text-[#637381]">Haz clic en cualquier perfil de prueba para completar credenciales e ingresar directamente.</p>
          </div>
          <span class="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Modo Desarrollo
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (profile of demoProfiles; track profile.correo) {
            <div class="p-4 bg-[#F7F7F8] border border-[#E1E2E9] rounded-2xl flex flex-col justify-between space-y-3 hover:border-[#FE5615]/50 transition-colors">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold text-[#FE5615] uppercase tracking-wider">{{ profile.label }}</span>
                  <span 
                    [class]="profile.estado === 'Activa' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'"
                    class="px-2 py-0.5 rounded-md text-[9px] font-bold border"
                  >
                    {{ profile.estado }}
                  </span>
                </div>

                <div>
                  <h4 class="font-bold text-xs text-[#1A1A1A]">{{ profile.nombre }}</h4>
                  <p class="text-[11px] text-[#637381]">{{ profile.correo }}</p>
                </div>

                <div class="space-y-1 text-[11px] bg-white p-2.5 rounded-xl border border-[#E1E2E9]">
                  <div class="flex items-center gap-1">
                    <span class="text-[#637381] font-semibold">Roles:</span>
                    <div class="flex flex-wrap gap-1">
                      @for (r of profile.roles; track r) {
                        <span class="px-1.5 py-0.2 bg-[#FE5615]/10 text-[#FE5615] font-bold text-[9px] rounded">
                          {{ r }}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="truncate"><span class="text-[#637381] font-semibold">Conjunto:</span> <span class="font-medium text-[#1A1A1A]">{{ profile.conjunto }}</span></div>
                  <div><span class="text-[#637381] font-semibold">Vivienda:</span> <span class="font-medium text-[#1A1A1A]">{{ profile.vivienda }}</span></div>
                </div>
              </div>

              <button 
                type="button" 
                (click)="onSelectDemoProfile(profile)"
                class="w-full py-2 bg-[#FE5615] text-white font-bold text-xs rounded-xl hover:bg-[#e0480f] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Iniciar Sesión</span>
                <span class="material-icons text-sm">login</span>
              </button>
            </div>
          }
        </div>
      </div>

    </div>
  `
})
export class LoginComponent {
  @Output() goToRegister = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private vivoService = inject(VivoFacilService);

  showPassword = signal<boolean>(false);
  errorMessage: string | null = null;

  loginForm = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onPasswordKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
    }
  }

  demoProfiles: DemoProfile[] = [
    {
      label: 'Administrador 1',
      nombre: 'Carlos Mendoza',
      correo: 'carlos@vivofacil.com',
      roles: ['Administrador'],
      estado: 'Activa',
      conjunto: 'Residencial Los Olivos',
      vivienda: 'Casa #12'
    },
    {
      label: 'Administrador 2',
      nombre: 'Beatriz Solís',
      correo: 'beatriz@vivofacil.com',
      roles: ['Administrador'],
      estado: 'Activa',
      conjunto: 'Privada El Roble',
      vivienda: 'Oficina Admin Roble'
    },
    {
      label: 'Vigilante',
      nombre: 'Juan Pérez (Vigilancia)',
      correo: 'vigilante@vivofacil.com',
      roles: ['Vigilante'],
      estado: 'Activa',
      conjunto: 'Residencial Los Olivos',
      vivienda: 'Caseta Principal'
    },
    {
      label: 'Residente',
      nombre: 'María Fernanda Gómez',
      correo: 'maria@vivofacil.com',
      roles: ['Residente'],
      estado: 'Activa',
      conjunto: 'Residencial Los Olivos',
      vivienda: 'Casa #14'
    },
    {
      label: 'Residente + Vigilante',
      nombre: 'Ricardo Treviño',
      correo: 'ricardo@vivofacil.com',
      roles: ['Residente', 'Vigilante'],
      estado: 'Activa',
      conjunto: 'Residencial Los Olivos',
      vivienda: 'Casa #18'
    },
    {
      label: 'Administrador + Residente',
      nombre: 'Elena Castro',
      correo: 'elena@vivofacil.com',
      roles: ['Administrador', 'Residente'],
      estado: 'Activa',
      conjunto: 'Residencial Los Olivos',
      vivienda: 'Casa #20'
    },
    {
      label: 'Pendiente de aprobación',
      nombre: 'Sofía Ramírez López',
      correo: 'sofia@vivofacil.com',
      roles: ['Residente'],
      estado: 'Pendiente',
      conjunto: 'Residencial Los Olivos',
      vivienda: 'Casa #25'
    },

    // --- Fraccionamiento Las Hadas ---
    {
      label: 'Admin (Las Hadas)',
      nombre: 'Laura Hinojosa',
      correo: 'admin.hadas@vivofacil.com',
      roles: ['Administrador'],
      estado: 'Activa',
      conjunto: 'Fraccionamiento Las Hadas',
      vivienda: 'Casa 1'
    },
    {
      label: 'Vigilante (Las Hadas)',
      nombre: 'Mario Rendón',
      correo: 'vigilante.hadas@vivofacil.com',
      roles: ['Vigilante'],
      estado: 'Activa',
      conjunto: 'Fraccionamiento Las Hadas',
      vivienda: 'Caseta Principal'
    },
    {
      label: 'Residente (Las Hadas)',
      nombre: 'Gabriel Peralta',
      correo: 'residente.hadas@vivofacil.com',
      roles: ['Residente'],
      estado: 'Activa',
      conjunto: 'Fraccionamiento Las Hadas',
      vivienda: 'Casa 5'
    },
    {
      label: 'Todos los Roles (Las Hadas)',
      nombre: 'Verónica Suárez',
      correo: 'todos.hadas@vivofacil.com',
      roles: ['Administrador', 'Vigilante', 'Residente'],
      estado: 'Activa',
      conjunto: 'Fraccionamiento Las Hadas',
      vivienda: 'Casa 10'
    },

    // --- Residencial Cumbres ---
    {
      label: 'Admin (Cumbres)',
      nombre: 'Fernando Morales',
      correo: 'admin.cumbres@vivofacil.com',
      roles: ['Administrador'],
      estado: 'Activa',
      conjunto: 'Residencial Cumbres',
      vivienda: 'Casa 1'
    },
    {
      label: 'Vigilante (Cumbres)',
      nombre: 'José Luis Aguilar',
      correo: 'vigilante.cumbres@vivofacil.com',
      roles: ['Vigilante'],
      estado: 'Activa',
      conjunto: 'Residencial Cumbres',
      vivienda: 'Caseta Principal'
    },
    {
      label: 'Residente (Cumbres)',
      nombre: 'Daniela Osorio',
      correo: 'residente.cumbres@vivofacil.com',
      roles: ['Residente'],
      estado: 'Activa',
      conjunto: 'Residencial Cumbres',
      vivienda: 'Casa 5'
    },
    {
      label: 'Todos los Roles (Cumbres)',
      nombre: 'Alejandro Ruiz',
      correo: 'todos.cumbres@vivofacil.com',
      roles: ['Administrador', 'Vigilante', 'Residente'],
      estado: 'Activa',
      conjunto: 'Residencial Cumbres',
      vivienda: 'Casa 10'
    },

    // --- Residencial Real de Palmas ---
    {
      label: 'Admin (Real de Palmas)',
      nombre: 'Patricio Domínguez',
      correo: 'admin.realpalmas@vivofacil.com',
      roles: ['Administrador'],
      estado: 'Activa',
      conjunto: 'Residencial Real de Palmas',
      vivienda: 'Casa 1'
    },
    {
      label: 'Vigilante (Real de Palmas)',
      nombre: 'Ramón Gutiérrez',
      correo: 'vigilante.realpalmas@vivofacil.com',
      roles: ['Vigilante'],
      estado: 'Activa',
      conjunto: 'Residencial Real de Palmas',
      vivienda: 'Caseta Principal'
    },
    {
      label: 'Residente (Real de Palmas)',
      nombre: 'Claudia Armenta',
      correo: 'residente.realpalmas@vivofacil.com',
      roles: ['Residente'],
      estado: 'Activa',
      conjunto: 'Residencial Real de Palmas',
      vivienda: 'Casa 8'
    },
    {
      label: 'Todos los Roles (Real de Palmas)',
      nombre: 'Guillermo Lara',
      correo: 'todos.realpalmas@vivofacil.com',
      roles: ['Administrador', 'Vigilante', 'Residente'],
      estado: 'Activa',
      conjunto: 'Residencial Real de Palmas',
      vivienda: 'Casa 15'
    },

    // --- Residential Capitol Villahermosa ---
    {
      label: 'Admin (Capitol)',
      nombre: 'Valeria Camargo',
      correo: 'admin.capitol@vivofacil.com',
      roles: ['Administrador'],
      estado: 'Activa',
      conjunto: 'Residential Capitol Villahermosa',
      vivienda: 'Casa 1'
    },
    {
      label: 'Vigilante (Capitol)',
      nombre: 'Esteban Cabrera',
      correo: 'vigilante.capitol@vivofacil.com',
      roles: ['Vigilante'],
      estado: 'Activa',
      conjunto: 'Residential Capitol Villahermosa',
      vivienda: 'Caseta Principal'
    },
    {
      label: 'Residente (Capitol)',
      nombre: 'Andrea Rivas',
      correo: 'residente.capitol@vivofacil.com',
      roles: ['Residente'],
      estado: 'Activa',
      conjunto: 'Residential Capitol Villahermosa',
      vivienda: 'Casa 5'
    },
    {
      label: 'Todos los Roles (Capitol)',
      nombre: 'Rodrigo Valenzuela',
      correo: 'todos.capitol@vivofacil.com',
      roles: ['Administrador', 'Vigilante', 'Residente'],
      estado: 'Activa',
      conjunto: 'Residential Capitol Villahermosa',
      vivienda: 'Casa 10'
    }
  ];

  async onSubmit() {
    if (this.loginForm.invalid) return;
    const { correo, password } = this.loginForm.value;
    
    const user = this.vivoService.users().find(u => u.correo.toLowerCase() === correo!.toLowerCase());
    const preferredRole = user ? user.roles[0] : undefined;

    const res = await this.vivoService.login(correo!, password!, preferredRole);
    if (!res.success) {
      this.errorMessage = res.message || 'Error al iniciar sesión';
    } else {
      this.errorMessage = null;
    }
  }

  onSelectDemoProfile(profile: DemoProfile) {
    this.loginForm.patchValue({
      correo: profile.correo,
      password: '123456'
    });

    const user = this.vivoService.users().find(u => u.correo.toLowerCase() === profile.correo.toLowerCase());
    const rolesToUse = user ? user.roles : profile.roles;

    this.executeDemoLogin(profile.correo, rolesToUse[0]);
  }

  async executeDemoLogin(email: string, role: UserRole) {
    const password = this.loginForm.get('password')?.value || '123456';
    const res = await this.vivoService.login(email, password, role);
    if (!res.success) {
      this.errorMessage = res.message || 'Error en inicio de sesión';
    } else {
      this.errorMessage = null;
    }
  }
}
