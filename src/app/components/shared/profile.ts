import { Component, signal, inject, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { VivoFacilService } from '../../services/vivofacil.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-1 sm:px-3 py-2 sm:py-4 space-y-4 sm:space-y-6">
      
      <!-- Hidden File Inputs for Device & Camera Capture -->
      <input 
        #fileInput 
        type="file" 
        accept="image/*" 
        class="hidden" 
        (change)="onFileSelected($event)" 
      />
      <input 
        #cameraInput 
        type="file" 
        accept="image/*" 
        capture="environment" 
        class="hidden" 
        (change)="onFileSelected($event)" 
      />

      <!-- Header -->
      <div class="bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-[#1A1A1A]">Mi Perfil</h1>
          <p class="text-xs text-[#637381] mt-1">Gestiona tu información personal y credenciales de acceso</p>
        </div>
        <span class="px-3 py-1 bg-[#FE5615]/10 text-[#FE5615] font-bold text-xs rounded-full border border-[#FE5615]/20">
          {{ currentUser()?.status }}
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Profile Picture & Administrative Info Card -->
        <div class="lg:col-span-1 bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-5">
          <div class="text-center space-y-3">
            
            <!-- Avatar with Pencil Overlay Button -->
            <div class="relative w-28 h-28 mx-auto">
              <!-- Circular Avatar Picture -->
              <div class="w-28 h-28 rounded-full bg-[#F7F7F8] border-2 border-[#FE5615] flex items-center justify-center shadow-inner overflow-hidden">
                @if (currentUser()?.avatarUrl) {
                  <img [src]="currentUser()?.avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
                } @else {
                  <span class="material-icons text-[88px] leading-none text-[#FE5615] select-none flex items-center justify-center">person</span>
                }
              </div>
              
              <!-- Pencil Icon Button -->
              <button 
                type="button" 
                (click)="openAvatarModal()" 
                class="absolute bottom-0 right-0 p-2 bg-[#FE5615] text-white rounded-full shadow-md hover:bg-[#e0480f] transition-transform hover:scale-110 cursor-pointer flex items-center justify-center border-2 border-white z-10"
                title="Cambiar fotografía de perfil"
              >
                <span class="material-icons text-sm">edit</span>
              </button>
            </div>

            <div>
              <h2 class="font-bold text-base text-[#1A1A1A]">{{ currentUser()?.nombreCompleto }}</h2>
              <p class="text-xs text-[#637381]">{{ currentUser()?.correo }}</p>
            </div>
          </div>

          <hr class="border-[#E1E2E9]" />

          <!-- Fixed Read-Only Properties -->
          <div class="space-y-4 text-xs">
            <!-- Hidden Account Status as per user request -->

            <div class="space-y-1 bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9]">
              <span class="text-[#637381] font-medium block">Roles Asignados:</span>
              <div class="flex flex-wrap gap-1 pt-1">
                @for (role of currentUser()?.roles; track role) {
                  <span class="px-2 py-0.5 bg-[#FE5615] text-white font-semibold text-[10px] rounded-md">
                    {{ role }}
                  </span>
                }
              </div>
            </div>

            <div class="space-y-1 bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9]">
              <span class="text-[#637381] font-medium block">Conjunto Habitacional:</span>
              <strong class="text-[#1A1A1A] font-semibold block">{{ currentComplex().nombre }}</strong>
              <span class="text-[10px] text-[#637381]">{{ currentComplex().ciudad }}</span>
            </div>

            <div class="space-y-1 bg-[#F7F7F8] p-3 rounded-xl border border-[#E1E2E9]">
              <span class="text-[#637381] font-medium block">Vivienda Asignada:</span>
              <strong class="text-[#FE5615] font-bold block">{{ currentUser()?.viviendaNumero || 'Sin asignar' }}</strong>
            </div>

            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
              <div class="flex items-center gap-1 font-semibold text-amber-900">
                <span class="material-icons text-sm text-amber-600">lock</span>
                <span>Restricción Administrativa</span>
              </div>
              <p class="leading-tight">Tus roles, estado, conjunto habitacional y vivienda asignada únicamente pueden ser modificados por un Administrador.</p>
            </div>
          </div>
        </div>

        <!-- Editable Personal Information Form -->
        <div class="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E1E2E9] shadow-xs space-y-6">
          <div class="pb-3 border-b border-[#E1E2E9]">
            <h2 class="font-bold text-[#1A1A1A] text-base">Editar Información Personal</h2>
            <p class="text-xs text-[#637381]">Modifica tus datos de contacto y contraseña de acceso</p>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <div>
              <label for="prof-fullname" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Nombre Completo *</label>
              <input 
                id="prof-fullname"
                type="text" 
                formControlName="nombreCompleto"
                class="w-full px-3.5 py-2.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="prof-email" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Correo Electrónico *</label>
                <input 
                  id="prof-email"
                  type="email" 
                  formControlName="correo"
                  class="w-full px-3.5 py-2.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
                />
              </div>

              <div>
                <label for="prof-phone" class="block text-xs font-semibold text-[#1A1A1A] mb-1">Teléfono Móvil *</label>
                <input 
                  id="prof-phone"
                  type="tel" 
                  formControlName="telefono"
                  class="w-full px-3.5 py-2.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs font-medium focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A]"
                />
              </div>
            </div>

            <!-- Sección Cambio de Contraseña -->
            <div class="pt-4 border-t border-[#E1E2E9] space-y-3">
              <div>
                <h3 class="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">Cambiar Contraseña</h3>
                <p class="text-[11px] text-[#637381] mt-0.5">
                  Deja los tres campos vacíos si únicamente deseas actualizar tus datos personales.
                </p>
              </div>

              <!-- Contraseña Actual -->
              <div>
                <label for="prof-curr-pass" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Contraseña Actual {{ isChangingPassword() ? '*' : '' }}
                </label>
                <div class="relative">
                  <input 
                    id="prof-curr-pass"
                    [type]="showCurrentPassword() ? 'text' : 'password'" 
                    formControlName="currentPassword"
                    (keydown)="onPasswordKeyDown($event)"
                    placeholder="••••••••"
                    class="w-full px-3.5 py-2.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A] pr-10"
                  />
                  <button 
                    type="button"
                    (click)="showCurrentPassword.set(!showCurrentPassword())"
                    class="absolute right-3 top-2.5 text-[#637381] hover:text-[#FE5615] focus:outline-none cursor-pointer"
                    title="Mostrar / ocultar contraseña"
                  >
                    <span class="material-icons text-sm">{{ showCurrentPassword() ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Nueva Contraseña -->
                <div>
                  <label for="prof-new-pass" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Nueva Contraseña {{ isChangingPassword() ? '*' : '' }}
                  </label>
                  <div class="relative">
                    <input 
                      id="prof-new-pass"
                      [type]="showNewPassword() ? 'text' : 'password'" 
                      formControlName="newPassword"
                      (keydown)="onPasswordKeyDown($event)"
                      placeholder="••••••••"
                      class="w-full px-3.5 py-2.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A] pr-10"
                    />
                    <button 
                      type="button"
                      (click)="showNewPassword.set(!showNewPassword())"
                      class="absolute right-3 top-2.5 text-[#637381] hover:text-[#FE5615] focus:outline-none cursor-pointer"
                      title="Mostrar / ocultar contraseña"
                    >
                      <span class="material-icons text-sm">{{ showNewPassword() ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                  @for (err of getNewPasswordErrors(); track err) {
                    <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                      <span class="material-icons text-sm shrink-0">warning</span>
                      <span>{{ err }}</span>
                    </p>
                  }
                </div>

                <!-- Confirmar Contraseña -->
                <div>
                  <label for="prof-conf-pass" class="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Confirmar Contraseña {{ isChangingPassword() ? '*' : '' }}
                  </label>
                  <div class="relative">
                    <input 
                      id="prof-conf-pass"
                      [type]="showConfirmPassword() ? 'text' : 'password'" 
                      formControlName="confirmPassword"
                      (keydown)="onPasswordKeyDown($event)"
                      placeholder="••••••••"
                      class="w-full px-3.5 py-2.5 bg-[#F7F7F8] border border-[#E1E2E9] rounded-xl text-xs focus:outline-none focus:border-[#FE5615] focus:bg-white text-[#1A1A1A] pr-10"
                    />
                    <button 
                      type="button"
                      (click)="showConfirmPassword.set(!showConfirmPassword())"
                      class="absolute right-3 top-2.5 text-[#637381] hover:text-[#FE5615] focus:outline-none cursor-pointer"
                      title="Mostrar / ocultar contraseña"
                    >
                      <span class="material-icons text-sm">{{ showConfirmPassword() ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                  </div>
                  @if (isPasswordMismatch()) {
                    <p class="text-orange-600 text-[12px] font-medium flex items-center gap-1.5 mt-1.5">
                      <span class="material-icons text-sm shrink-0">warning</span>
                      <span>Las contraseñas no coinciden</span>
                    </p>
                  }
                </div>
              </div>
            </div>

            @if (errorMessage) {
              <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span class="material-icons text-base shrink-0">error_outline</span>
                <span>{{ errorMessage }}</span>
              </div>
            }

            @if (successMessage) {
              <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <span class="material-icons text-base text-emerald-600 shrink-0">check_circle</span>
                <span>{{ successMessage }}</span>
              </div>
            }

            <div class="pt-4 border-t border-[#E1E2E9] flex items-center justify-end gap-3">
              <button 
                type="button"
                (click)="resetForm()"
                class="px-4 py-2 bg-[#F7F7F8] text-[#1A1A1A] font-semibold text-xs rounded-xl hover:bg-gray-200 transition-colors border border-[#E1E2E9] cursor-pointer"
              >
                Deshacer Cambios
              </button>

              <button 
                type="submit"
                [disabled]="isSubmitting()"
                class="px-5 py-2 bg-[#FE5615] text-white font-bold text-xs rounded-xl hover:bg-[#e0480f] transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                @if (isSubmitting()) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                } @else {
                  <span class="material-icons text-sm">save</span>
                }
                <span>Guardar Cambios</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>

    <!-- Modal para Actualizar Fotografía de Perfil -->
    @if (showPhotoModal()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div [class]="getModalSizeClass() + ' bg-white rounded-2xl p-6 space-y-5 border border-[#E1E2E9] shadow-xl max-h-[92vh] flex flex-col min-h-0 overflow-y-auto'">
          
          <div class="flex items-center justify-between pb-3 border-b border-[#E1E2E9] gap-2 flex-wrap sm:flex-nowrap">
            <h3 class="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
              <span class="material-icons text-[#FE5615]">add_a_photo</span>
              Actualizar Fotografía de Perfil
            </h3>

            <div class="flex items-center gap-2 shrink-0">
              <button (click)="closeAvatarModal()" class="text-[#637381] hover:text-[#1A1A1A] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <span class="material-icons text-xl">close</span>
              </button>
            </div>
          </div>

          <!-- Camera Stream Section -->
          @if (isCameraStreamActive()) {
            <div class="space-y-3 text-center">
              <div class="relative max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-[#FE5615] bg-black shadow-lg">
                <video #videoStream autoplay playsinline class="w-full h-56 object-cover"></video>
                <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                  <button 
                    type="button"
                    (click)="captureFromStream()"
                    class="px-4 py-1.5 bg-[#FE5615] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#e0480f] flex items-center gap-1 cursor-pointer"
                  >
                    <span class="material-icons text-sm">camera_alt</span>
                    <span>Tomar Foto</span>
                  </button>
                  <button 
                    type="button"
                    (click)="stopCameraStream()"
                    class="px-3 py-1.5 bg-gray-800 text-white font-semibold text-xs rounded-xl hover:bg-gray-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
              <p class="text-xs text-[#637381]">Apunta tu cámara y presiona "Tomar Foto".</p>
            </div>
          } @else {
            <!-- Drag & Drop Container and Preview -->
            <div 
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              [class.border-[#FE5615]]="isDragging()"
              [class.bg-[#FE5615]/5]="isDragging()"
              class="w-full p-4 border-2 border-dashed border-[#E1E2E9] hover:border-[#FE5615] rounded-2xl text-center space-y-3 transition-colors cursor-pointer"
            >
              <div class="w-28 h-28 mx-auto rounded-full bg-[#F7F7F8] border-2 border-dashed border-[#FE5615] overflow-hidden flex items-center justify-center shadow-inner relative">
                @if (tempAvatarPreview()) {
                  <img [src]="tempAvatarPreview()" alt="Preview" class="w-full h-full object-cover" />
                } @else if (currentUser()?.avatarUrl) {
                  <img [src]="currentUser()?.avatarUrl" alt="Actual" class="w-full h-full object-cover" />
                } @else {
                  <span class="material-icons text-6xl text-[#637381]">account_circle</span>
                }
              </div>
              <div>
                <p class="text-xs font-bold text-[#1A1A1A]">Arrastra y suelta tu imagen aquí</p>
                <p class="text-[11px] text-[#637381]">o selecciona una de las siguientes opciones</p>
              </div>
            </div>

            <!-- Selection Action Buttons -->
            <div class="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                (click)="triggerFileSelect()"
                class="py-2.5 px-3 bg-[#F7F7F8] hover:bg-gray-200 border border-[#E1E2E9] text-[#1A1A1A] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span class="material-icons text-base text-[#FE5615]">photo_library</span>
                <span>Galería / Archivos</span>
              </button>

              <button 
                type="button" 
                (click)="triggerCameraCapture()"
                class="py-2.5 px-3 bg-[#F7F7F8] hover:bg-gray-200 border border-[#E1E2E9] text-[#1A1A1A] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span class="material-icons text-base text-[#FE5615]">photo_camera</span>
                <span>Tomar Fotografía</span>
              </button>
            </div>
          }

          <!-- Modal Actions -->
          <div class="pt-3 border-t border-[#E1E2E9] flex items-center justify-end gap-2">
            <button 
              type="button" 
              (click)="closeAvatarModal()"
              class="px-4 py-2 bg-[#F7F7F8] text-[#1A1A1A] font-semibold text-xs rounded-xl border border-[#E1E2E9]"
            >
              Cancelar
            </button>
            
            <button 
              type="button" 
              (click)="saveNewAvatar()"
              [disabled]="!tempAvatarPreview()"
              class="px-5 py-2 bg-[#FE5615] text-white font-bold text-xs rounded-xl hover:bg-[#e0480f] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span class="material-icons text-sm">check</span>
              <span>Guardar Fotografía</span>
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class ProfileComponent implements OnDestroy {
  private vivoService = inject(VivoFacilService);
  private fb = inject(FormBuilder);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('videoStream') videoElementRef?: ElementRef<HTMLVideoElement>;

  currentUser = this.vivoService.currentUser;
  currentComplex = this.vivoService.currentComplex;

  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  isSubmitting = signal<boolean>(false);
  showPhotoModal = signal<boolean>(false);
  modalSize = signal<'sm' | 'md' | 'lg' | 'full'>('md');
  tempAvatarPreview = signal<string | null>(null);
  isDragging = signal<boolean>(false);
  isCameraStreamActive = signal<boolean>(false);
  mediaStream: MediaStream | null = null;

  errorMessage: string | null = null;
  successMessage: string | null = null;

  setModalSize(size: 'sm' | 'md' | 'lg' | 'full') {
    this.modalSize.set(size);
  }

  cycleModalSize() {
    const current = this.modalSize();
    if (current === 'sm') this.modalSize.set('md');
    else if (current === 'md') this.modalSize.set('lg');
    else if (current === 'lg') this.modalSize.set('full');
    else this.modalSize.set('sm');
  }

  getModalSizeClass(): string {
    switch (this.modalSize()) {
      case 'sm': return 'max-w-sm w-full transition-all duration-300 ease-in-out';
      case 'md': return 'max-w-md w-full transition-all duration-300 ease-in-out';
      case 'lg': return 'max-w-3xl w-full transition-all duration-300 ease-in-out';
      case 'full': return 'max-w-[95vw] w-full max-h-[92vh] h-auto overflow-y-auto transition-all duration-300 ease-in-out';
      default: return 'max-w-md w-full transition-all duration-300 ease-in-out';
    }
  }

  passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value || '';
      if (!val) return null;
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

  profileForm = this.fb.group({
    nombreCompleto: [this.currentUser()?.nombreCompleto || '', [Validators.required, Validators.minLength(3)]],
    correo: [this.currentUser()?.correo || '', [Validators.required, Validators.email]],
    telefono: [this.currentUser()?.telefono || '', [Validators.required, Validators.minLength(8)]],
    currentPassword: [''],
    newPassword: ['', [this.passwordValidator()]],
    confirmPassword: ['']
  });

  isChangingPassword(): boolean {
    const curr = (this.profileForm.get('currentPassword')?.value || '').trim();
    const newP = (this.profileForm.get('newPassword')?.value || '').trim();
    const confP = (this.profileForm.get('confirmPassword')?.value || '').trim();
    return curr.length > 0 || newP.length > 0 || confP.length > 0;
  }

  getNewPasswordErrors(): string[] {
    if (!this.isChangingPassword()) return [];
    const val = (this.profileForm.get('newPassword')?.value || '').trim();
    if (!val) return [];
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
    if (!this.isChangingPassword()) return false;
    const newP = this.profileForm.get('newPassword')?.value || '';
    const confP = this.profileForm.get('confirmPassword')?.value || '';
    return confP.length > 0 && newP !== confP;
  }

  openAvatarModal() {
    this.tempAvatarPreview.set(null);
    this.showPhotoModal.set(true);
  }

  closeAvatarModal() {
    this.stopCameraStream();
    this.showPhotoModal.set(false);
    this.tempAvatarPreview.set(null);
    this.isDragging.set(false);
  }

  triggerFileSelect() {
    this.fileInputRef?.nativeElement?.click();
  }

  async triggerCameraCapture() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        this.isCameraStreamActive.set(true);
        setTimeout(() => {
          if (this.videoElementRef?.nativeElement && this.mediaStream) {
            this.videoElementRef.nativeElement.srcObject = this.mediaStream;
          }
        }, 150);
      } catch {
        // Fallback to camera input click
        this.cameraInputRef?.nativeElement?.click();
      }
    } else {
      this.cameraInputRef?.nativeElement?.click();
    }
  }

  captureFromStream() {
    if (this.videoElementRef?.nativeElement) {
      const video = this.videoElementRef.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        this.tempAvatarPreview.set(dataUrl);
      }
    }
    this.stopCameraStream();
  }

  stopCameraStream() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCameraStreamActive.set(false);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          this.tempAvatarPreview.set(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.vivoService.showToast('Por favor selecciona un archivo de imagen válido.', 'error');
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.tempAvatarPreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async saveNewAvatar() {
    const preview = this.tempAvatarPreview();
    if (preview) {
      await this.vivoService.updateProfile({
        avatarUrl: preview
      });
      this.closeAvatarModal();
    }
  }

  resetForm() {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        nombreCompleto: user.nombreCompleto,
        correo: user.correo,
        telefono: user.telefono,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      this.errorMessage = null;
      this.successMessage = null;
    }
  }

  async onSubmit() {
    this.errorMessage = null;
    this.successMessage = null;

    const val = this.profileForm.value;
    const nombreCompleto = (val.nombreCompleto || '').trim();
    const correo = (val.correo || '').trim();
    const telefono = (val.telefono || '').trim();

    if (!nombreCompleto || nombreCompleto.length < 3) {
      this.errorMessage = 'Ingresa tu Nombre Completo (mínimo 3 caracteres).';
      return;
    }
    if (!correo || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(correo)) {
      this.errorMessage = 'Ingresa un correo electrónico válido.';
      return;
    }
    if (!telefono || telefono.length < 8) {
      this.errorMessage = 'Ingresa un número telefónico válido (mínimo 8 dígitos).';
      return;
    }

    const currPass = (val.currentPassword || '').trim();
    const newPass = (val.newPassword || '').trim();
    const confPass = (val.confirmPassword || '').trim();

    const isChangingPassword = currPass.length > 0 || newPass.length > 0 || confPass.length > 0;

    if (isChangingPassword) {
      if (!currPass || !newPass || !confPass) {
        this.errorMessage = 'Para cambiar tu contraseña, debes completar los tres campos: Contraseña actual, Nueva contraseña y Confirmar contraseña.';
        return;
      }

      const passwordErrors = this.getNewPasswordErrors();
      if (passwordErrors.length > 0) {
        this.errorMessage = 'La nueva contraseña no cumple con los requisitos de seguridad.';
        return;
      }

      if (newPass !== confPass) {
        this.errorMessage = 'La nueva contraseña y su confirmación no coinciden.';
        return;
      }
    }

    this.isSubmitting.set(true);

    try {
      const res = await this.vivoService.updateProfile({
        nombreCompleto,
        correo,
        telefono,
        currentPassword: isChangingPassword ? currPass : undefined,
        newPassword: isChangingPassword ? newPass : undefined
      });

      if (res.success) {
        this.successMessage = res.message;
        if (isChangingPassword) {
          this.profileForm.patchValue({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }
      } else {
        this.errorMessage = res.message;
      }
    } catch (err: unknown) {
      this.errorMessage = err instanceof Error ? err.message : 'Error al actualizar la información del perfil.';
    } finally {
      this.isSubmitting.set(false);
    }
  }

  ngOnDestroy() {
    this.stopCameraStream();
  }
}
