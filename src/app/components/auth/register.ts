import { Component, EventEmitter, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { VivoFacilService } from '../../services/vivofacil.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-lg w-full bg-white rounded-2xl border border-[#E1E2E9] shadow-md p-8">
        
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-[#FE5615] text-white rounded-2xl mx-auto flex items-center justify-center font-bold text-xl shadow-sm mb-2">
            VF
          </div>
          <h2 class="text-2xl font-bold text-[#1A1A1A]">Crear Cuenta Nueva</h2>
          <p class="text-xs text-[#637381] mt-1">
            Registro libre de usuarios. Las cuentas nuevas inician como <strong>Residente</strong> con estado <strong>Pendiente de Aprobación</strong>.
          </p>
        </div>

        @if (errorMessage) {
          <div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span class="material-icons text-base">error_outline</span>
            <span>{{ errorMessage }}</span>
          </div>
        }

        @if (successMessage) {
          <div class="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <span class="material-icons text-base text-emerald-600">check_circle</span>
            <span>{{ successMessage }}</span>
          </div>
        }

        <!-- Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4" novalidate>
          
          <!-- Nombre Completo -->
          <div>
            <label for="reg-nombre" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Nombre Completo *</label>
            <input 
              id="reg-nombre"
              type="text" 
              formControlName="nombreCompleto"
              placeholder="Ej. Roberto Gómez Bolaños"
              [class.border-orange-500]="isFieldInvalid('nombreCompleto')"
              [class.ring-2]="isFieldInvalid('nombreCompleto')"
              [class.ring-orange-200]="isFieldInvalid('nombreCompleto')"
              class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] transition-all"
            />
            @if (isFieldInvalid('nombreCompleto')) {
              <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                <span class="material-icons text-sm shrink-0">warning</span>
                <span>debe ingresar su Nombre Completo</span>
              </p>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Correo Electrónico -->
            <div>
              <label for="reg-correo" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Correo Electrónico *</label>
              <input 
                id="reg-correo"
                type="email" 
                formControlName="correo"
                placeholder="ejemplo@vivofacil.com"
                (blur)="onCorreoBlur()"
                [class.border-orange-500]="isFieldInvalid('correo')"
                [class.ring-2]="isFieldInvalid('correo')"
                [class.ring-orange-200]="isFieldInvalid('correo')"
                class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] transition-all"
              />
              @if (isFieldInvalid('correo')) {
                <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                  <span class="material-icons text-sm shrink-0">warning</span>
                  <span>correo inválido</span>
                </p>
              }
            </div>

            <!-- Número Telefónico -->
            <div>
              <label for="reg-telefono" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Número Telefónico *</label>
              <input 
                id="reg-telefono"
                type="tel" 
                formControlName="telefono"
                placeholder="3312345678"
                maxlength="10"
                (input)="onPhoneInput($event)"
                [class.border-orange-500]="isFieldInvalid('telefono')"
                [class.ring-2]="isFieldInvalid('telefono')"
                [class.ring-orange-200]="isFieldInvalid('telefono')"
                class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] transition-all"
              />
              @if (isFieldInvalid('telefono')) {
                <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                  <span class="material-icons text-sm shrink-0">warning</span>
                  <span>numero de teléfono inválido</span>
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Contraseña -->
            <div>
              <label for="reg-password" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Contraseña *</label>
              <div class="relative">
                <input 
                  id="reg-password"
                  [type]="showPassword() ? 'text' : 'password'" 
                  formControlName="password"
                  (keydown)="onPasswordKeyDown($event)"
                  placeholder="••••••••"
                  [class.border-orange-500]="isFieldInvalid('password')"
                  [class.ring-2]="isFieldInvalid('password')"
                  [class.ring-orange-200]="isFieldInvalid('password')"
                  class="w-full pl-3 pr-10 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] transition-all"
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
              @for (err of getPasswordErrors(); track err) {
                <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                  <span class="material-icons text-sm shrink-0">warning</span>
                  <span>{{ err }}</span>
                </p>
              }
            </div>

            <!-- Confirmar Contraseña -->
            <div>
              <label for="reg-confirm-password" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Confirmar Contraseña *</label>
              <div class="relative">
                <input 
                  id="reg-confirm-password"
                  [type]="showConfirmPassword() ? 'text' : 'password'" 
                  formControlName="confirmPassword"
                  placeholder="••••••••"
                  [class.border-orange-500]="isFieldInvalid('confirmPassword') || isPasswordMismatch()"
                  [class.ring-2]="isFieldInvalid('confirmPassword') || isPasswordMismatch()"
                  [class.ring-orange-200]="isFieldInvalid('confirmPassword') || isPasswordMismatch()"
                  class="w-full pl-3 pr-10 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] transition-all"
                />
                <button 
                  type="button"
                  (click)="showConfirmPassword.set(!showConfirmPassword())"
                  class="absolute right-3 top-2.5 text-[#637381] hover:text-[#FE5615] focus:outline-none cursor-pointer"
                  title="Mostrar / ocultar contraseña"
                >
                  <span class="material-icons text-lg">{{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
              @if (isFieldInvalid('confirmPassword') || isPasswordMismatch()) {
                <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                  <span class="material-icons text-sm shrink-0">warning</span>
                  <span>las contraseñas no coinciden</span>
                </p>
              }
            </div>
          </div>

          <!-- Housing Complex Selection -->
          <div>
            <label for="reg-complex" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Conjunto Habitacional *</label>
            <select 
              id="reg-complex"
              formControlName="complexId"
              (change)="onComplexChange($event)"
              [class.border-orange-500]="isFieldInvalid('complexId')"
              [class.ring-2]="isFieldInvalid('complexId')"
              [class.ring-orange-200]="isFieldInvalid('complexId')"
              class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] cursor-pointer transition-all"
            >
              <option value="">-- Selecciona un conjunto --</option>
              @for (c of complexes(); track c.id) {
                <option [value]="c.id">{{ c.nombre }} ({{ c.ciudad }})</option>
              }
            </select>
            @if (isFieldInvalid('complexId')) {
              <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                <span class="material-icons text-sm shrink-0">warning</span>
                <span>debe seleccionar un Conjunto Habitacional</span>
              </p>
            }
          </div>

          <!-- Housing Unit Selection -->
          <div>
            <label for="reg-vivienda" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Vivienda *</label>
            <select 
              id="reg-vivienda"
              formControlName="viviendaId"
              [class.border-orange-500]="isFieldInvalid('viviendaId')"
              [class.ring-2]="isFieldInvalid('viviendaId')"
              [class.ring-orange-200]="isFieldInvalid('viviendaId')"
              class="w-full px-3 py-2 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-sm focus:outline-none focus:border-[#FE5615] cursor-pointer transition-all"
            >
              <option value="">-- Selecciona una vivienda --</option>
              @for (v of availableUnits(); track v.id) {
                <option [value]="v.id">{{ v.numeroVivienda }} ({{ v.bloqueCalle }})</option>
              }
            </select>
            @if (selectedComplexId() && availableUnits().length === 0) {
              <p class="text-amber-700 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                <span class="material-icons text-sm shrink-0">info</span>
                <span>No hay viviendas disponibles con registro activo en Supabase para este conjunto habitacional.</span>
              </p>
            }
            @if (isFieldInvalid('viviendaId')) {
              <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                <span class="material-icons text-sm shrink-0">warning</span>
                <span>debe seleccionar una vivienda</span>
              </p>
            }
          </div>

          <!-- Specification Note: No role selection -->
          <div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
            <span class="material-icons text-base text-amber-600 shrink-0">info</span>
            <div>
              <strong>Rol asignado: Residente.</strong> Al registrarte, tu solicitud será enviada al Administrador del conjunto de vivienda para su aprobación.
            </div>
          </div>

          <button 
            type="submit" 
            [disabled]="isSubmitting()"
            [class.opacity-50]="isSubmitting()"
            [class.cursor-not-allowed]="isSubmitting()"
            class="w-full py-2.5 bg-[#FE5615] text-white font-semibold rounded-xl hover:bg-[#e0470b] transition-colors shadow-xs text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            @if (isSubmitting()) {
              <span class="material-icons animate-spin text-sm">refresh</span>
              <span>Enviando solicitud...</span>
            } @else {
              <span>Enviar Solicitud de Registro</span>
              <span class="material-icons text-sm">send</span>
            }
          </button>
        </form>

        <div class="mt-6 text-center text-xs text-[#637381]">
          ¿Ya tienes una cuenta? 
          <button (click)="goToLogin.emit()" class="font-semibold text-[#FE5615] hover:underline ml-1 cursor-pointer">
            Iniciar Sesión
          </button>
        </div>

      </div>
    </div>
  `
})
export class RegisterComponent {
  @Output() goToLogin = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private vivoService = inject(VivoFacilService);

  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  complexes = this.vivoService.complexes;
  selectedComplexId = signal<string>('');

  availableUnits = computed(() => {
    const cId = this.selectedComplexId();
    if (!cId) return [];
    const units = this.vivoService.units().filter(u => u.complexId === cId);
    if (this.vivoService.supabaseService.isConfigured) {
      const isValidUuid = (val?: string | null) =>
        typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      return units.filter(u => isValidUuid(u.remoteId));
    }
    return units;
  });

  errorMessage: string | null = null;
  successMessage: string | null = null;
  submitted = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value || '';
      if (!val) return { required: true };
      const errors: Record<string, boolean> = {};
      if (val.length < 8) errors['minlength'] = true;
      if (!/[A-Z]/.test(val)) errors['noUpper'] = true;
      if (!/[0-9]/.test(val)) errors['noNumber'] = true;
      if (/\s/.test(val)) errors['hasSpace'] = true;
      return Object.keys(errors).length ? errors : null;
    };
  }

  onPasswordKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
    }
  }

  registerForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    password: ['', [Validators.required, this.passwordValidator()]],
    confirmPassword: ['', [Validators.required]],
    complexId: ['', [Validators.required]],
    viviendaId: ['', [Validators.required]]
  });

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    if (!control) return false;
    return !!(control.invalid && (control.touched || control.dirty || this.submitted()));
  }

  getPasswordErrors(): string[] {
    if (!this.isFieldInvalid('password')) return [];
    const val = (this.registerForm.get('password')?.value || '').trim();
    const errors: string[] = [];
    if (val.length < 8) {
      errors.push('debe contener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(val)) {
      errors.push('debe contener al menos una mayúscula');
    }
    if (!/[0-9]/.test(val)) {
      errors.push('debe contener al menos un numero');
    }
    if (/\s/.test(val)) {
      errors.push('no debe contener espacios');
    }
    return errors;
  }

  isPasswordMismatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirm = this.registerForm.get('confirmPassword')?.value;
    const confirmControl = this.registerForm.get('confirmPassword');
    const isTouched = confirmControl && (confirmControl.touched || confirmControl.dirty || this.submitted());
    return !!(isTouched && (!confirm || password !== confirm));
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digits;
    this.registerForm.get('telefono')?.setValue(digits);
  }

  onComplexChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedComplexId.set(target.value);
    this.registerForm.patchValue({ viviendaId: '' });
  }

  onCorreoBlur() {
    const control = this.registerForm.get('correo');
    if (control && control.value) {
      const trimmed = (control.value as string).trim().toLowerCase();
      control.setValue(trimmed, { emitEvent: false });
    }
  }

  async onSubmit() {
    if (this.isSubmitting()) {
      console.warn('[Register] Intento de doble envío bloqueado.');
      return;
    }

    this.submitted.set(true);
    this.registerForm.markAllAsTouched();

    const val = this.registerForm.value;

    // Normalization of email: trim and lowercase
    const rawCorreo = val.correo || '';
    const cleanCorreo = rawCorreo.trim().toLowerCase();
    this.registerForm.get('correo')?.setValue(cleanCorreo, { emitEvent: false });

    if (this.registerForm.invalid || val.password !== val.confirmPassword) {
      this.errorMessage = 'Por favor, llena todos los campos obligatorios con la información requerida.';
      this.successMessage = null;
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage = null;

    try {
      const res = await this.vivoService.registerUser({
        nombreCompleto: (val.nombreCompleto || '').trim(),
        correo: cleanCorreo,
        telefono: (val.telefono || '').trim(),
        password: val.password || '',
        complexId: val.complexId!,
        viviendaId: val.viviendaId!
      });

      if (!res.success) {
        this.errorMessage = res.message || 'Error al registrar la cuenta.';
        this.successMessage = null;
        this.isSubmitting.set(false);
      } else {
        this.errorMessage = null;
        this.successMessage = 'Cuenta creada correctamente. Tu solicitud de registro fue enviada para aprobación.';
        this.vivoService.showToast('Cuenta creada correctamente. Tu solicitud de registro fue enviada para aprobación.', 'success');
        
        setTimeout(() => {
          this.goToLogin.emit();
        }, 1800);
      }
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Ocurrió un error inesperado durante el registro.';
      this.isSubmitting.set(false);
    }
  }
}
